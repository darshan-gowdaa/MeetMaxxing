"""
Qdrant memory client for MeetMaxxing.

Collection: meetmaxxing_memories
- Single collection, all memory types differentiated by payload `memory_type`
- Payload indexes on: org_id, user_id, meeting_id, memory_type, meeting_date
  for fast metadata filtering without relying solely on vector similarity
"""

import uuid
from qdrant_client import AsyncQdrantClient, models as qmodels
from ..core.config import settings
from .schemas import MemoryPoint, MemoryFilter, MemoryResult

_client: AsyncQdrantClient | None = None


async def get_qdrant() -> AsyncQdrantClient:
    global _client
    if _client is None:
        if settings.QDRANT_URL in [":memory:", "memory"]:
            _client = AsyncQdrantClient(location=":memory:")
        elif settings.QDRANT_URL == "local":
            _client = AsyncQdrantClient(path="./qdrant_data")
        else:
            try:
                test_client = AsyncQdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY or None,
                )
                await test_client.get_collections()
                _client = test_client
            except Exception:
                _client = AsyncQdrantClient(location=":memory:")
    return _client


async def ensure_collection() -> None:
    """Create collection + payload indexes if they don't exist."""
    client = await get_qdrant()
    collection_name = settings.QDRANT_COLLECTION

    existing = await client.get_collections()
    names = [c.name for c in existing.collections]

    if collection_name not in names:
        # Recreate collection to enable named vectors & sparse vectors for hybrid search
        await client.create_collection(
            collection_name=collection_name,
            vectors_config={
                "dense": qmodels.VectorParams(
                    size=settings.EMBEDDING_DIM,
                    distance=qmodels.Distance.COSINE,
                )
            },
            sparse_vectors_config={
                "sparse": qmodels.SparseVectorParams()
            },
            optimizers_config=qmodels.OptimizersConfigDiff(
                indexing_threshold=20_000,
            ),
        )

        # Create payload indexes for fast metadata filtering
        indexed_fields = [
            ("org_id", qmodels.PayloadSchemaType.KEYWORD),
            ("user_id", qmodels.PayloadSchemaType.KEYWORD),
            ("meeting_id", qmodels.PayloadSchemaType.KEYWORD),
            ("memory_type", qmodels.PayloadSchemaType.KEYWORD),
            ("meeting_date", qmodels.PayloadSchemaType.KEYWORD),
            ("speaker_id", qmodels.PayloadSchemaType.KEYWORD),
            ("priority", qmodels.PayloadSchemaType.INTEGER),
        ]
        for field_name, schema_type in indexed_fields:
            await client.create_payload_index(
                collection_name=collection_name,
                field_name=field_name,
                field_schema=schema_type,
            )


async def upsert_memories(points: list[MemoryPoint]) -> None:
    """Batch upsert memory points into Qdrant."""
    await ensure_collection()
    client = await get_qdrant()
    
    import collections
    import hashlib
    
    qdrant_points = []
    for p in points:
        # Generate simple hash-based sparse vector from the text content
        words = p.text.lower().split()
        freq = collections.Counter(words)
        sparse_indices = [int(hashlib.md5(w.encode()).hexdigest(), 16) % 1000000 for w in freq.keys()]
        sparse_values = [float(v) for v in freq.values()]
        
        vector_dict = {
            "dense": p.vector,
            "sparse": qmodels.SparseVector(indices=sparse_indices, values=sparse_values)
        }
        
        qdrant_points.append(
            qmodels.PointStruct(
                id=p.id,
                vector=vector_dict,
                payload=p.to_payload(),
            )
        )

    await client.upsert(
        collection_name=settings.QDRANT_COLLECTION,
        points=qdrant_points,
        wait=True,
    )


async def search_memories(
    query_vector: list[float],
    memory_filter: MemoryFilter,
    limit: int = 8,
) -> list[MemoryResult]:
    """
    Vector similarity search with mandatory metadata filtering.
    org_id filter is ALWAYS enforced — never cross-contaminate orgs.
    """
    await ensure_collection()
    client = await get_qdrant()

    must_conditions = [
        qmodels.FieldCondition(
            key="org_id",
            match=qmodels.MatchValue(value=memory_filter.org_id),
        )
    ]

    if memory_filter.user_id:
        must_conditions.append(
            qmodels.FieldCondition(
                key="user_id",
                match=qmodels.MatchValue(value=memory_filter.user_id),
            )
        )
    if memory_filter.meeting_id:
        must_conditions.append(
            qmodels.FieldCondition(
                key="meeting_id",
                match=qmodels.MatchValue(value=memory_filter.meeting_id),
            )
        )
    if memory_filter.speaker_id:
        must_conditions.append(
            qmodels.FieldCondition(
                key="speaker_id",
                match=qmodels.MatchValue(value=memory_filter.speaker_id),
            )
        )
    if memory_filter.memory_type:
        must_conditions.append(
            qmodels.FieldCondition(
                key="memory_type",
                match=qmodels.MatchValue(value=memory_filter.memory_type.value),
            )
        )
    if memory_filter.date_from:
        must_conditions.append(
            qmodels.FieldCondition(
                key="meeting_date",
                range=qmodels.Range(gte=memory_filter.date_from),
            )
        )
    if memory_filter.date_to:
        must_conditions.append(
            qmodels.FieldCondition(
                key="meeting_date",
                range=qmodels.Range(lte=memory_filter.date_to),
            )
        )

    # Create a simple sparse vector query using term frequencies
    import collections
    import hashlib
    # We use a crude hash-based BM25 approximation for hackathon hybrid search
    words = memory_filter.topic.lower().split() if memory_filter.topic else ["query"]
    freq = collections.Counter(words)
    sparse_indices = [int(hashlib.md5(w.encode()).hexdigest(), 16) % 1000000 for w in freq.keys()]
    sparse_values = [float(v) for v in freq.values()]

    prefetch = [
        qmodels.Prefetch(
            query=query_vector,
            using="dense",
            limit=limit
        ),
        qmodels.Prefetch(
            query=qmodels.SparseVector(indices=sparse_indices, values=sparse_values),
            using="sparse",
            limit=limit
        )
    ]

    results = await client.query_points(
        collection_name=settings.QDRANT_COLLECTION,
        prefetch=prefetch,
        query=qmodels.FusionQuery(fusion=qmodels.Fusion.RRF),
        query_filter=qmodels.Filter(must=must_conditions),
        limit=limit,
        with_payload=True,
    )

    return [
        MemoryResult(
            id=str(r.id),
            score=r.score,
            text=r.payload.get("text", ""),
            meeting_id=r.payload.get("meeting_id", ""),
            meeting_date=r.payload.get("meeting_date", ""),
            speaker_name=r.payload.get("speaker_name", ""),
            memory_type=r.payload.get("memory_type", ""),
            topic=r.payload.get("topic", ""),
        )
        for r in results.points
    ]


async def delete_meeting_memories(meeting_id: str, org_id: str) -> None:
    """Remove all memory points for a given meeting (e.g., if meeting deleted)."""
    client = await get_qdrant()
    await client.delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=qmodels.FilterSelector(
            filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="meeting_id",
                        match=qmodels.MatchValue(value=meeting_id),
                    ),
                    qmodels.FieldCondition(
                        key="org_id",
                        match=qmodels.MatchValue(value=org_id),
                    ),
                ]
            )
        ),
    )
