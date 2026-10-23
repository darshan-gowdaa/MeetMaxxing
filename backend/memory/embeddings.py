import asyncio
import collections
import hashlib

from google import genai
from google.genai import types as genai_types

from ..core.config import settings

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


async def _fallback_vector(text: str) -> list[float]:
    raise RuntimeError("GEMINI_API_KEY is not set. Cannot generate embeddings.")


# Simple in-memory LRU cache for embeddings
_embed_cache: collections.OrderedDict[str, list[float]] = collections.OrderedDict()
CACHE_MAX_SIZE = 1000


def _get_from_cache(text: str):
    if text in _embed_cache:
        _embed_cache.move_to_end(text)
        return _embed_cache[text]
    return None


def _set_in_cache(text: str, vector: list[float]):
    if text in _embed_cache:
        _embed_cache.move_to_end(text)
    _embed_cache[text] = vector
    if len(_embed_cache) > CACHE_MAX_SIZE:
        _embed_cache.popitem(last=False)


async def embed_text(text: str) -> list[float]:
    """Embed a single text string using Gemini gemini-embedding-001."""
    cached = _get_from_cache(text)
    if cached:
        return cached

    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY in [
        "your-gemini-api-key",
        "mock-key",
    ]:
        vec = await _fallback_vector(text)
        _set_in_cache(text, vec)
        return vec

    client = _get_client()
    try:
        result = await client.aio.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=genai_types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=settings.EMBEDDING_DIM,
            ),
        )
    except Exception:
        result = await asyncio.to_thread(
            client.models.embed_content,
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=genai_types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=settings.EMBEDDING_DIM,
            ),
        )
    vec = result.embeddings[0].values
    _set_in_cache(text, vec)
    return vec

    client = _get_client()
    # embed_content is a synchronous network call — offload it so it doesn't
    # block the FastAPI event loop.
    result = await asyncio.to_thread(
        client.models.embed_content,
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=text,
        config=genai_types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=settings.EMBEDDING_DIM,
        ),
    )
    vec = result.embeddings[0].values
    _set_in_cache(text, vec)
    return vec


async def embed_query(text: str) -> list[float]:
    """Embed a query string (different task_type for better retrieval recall)."""
    # Note: query embeddings might not be cached since they are highly variable and context-dependent
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY in [
        "your-gemini-api-key",
        "mock-key",
    ]:
        return await _fallback_vector(text)
    client = _get_client()
    result = await asyncio.to_thread(
        client.models.embed_content,
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=text,
        config=genai_types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=settings.EMBEDDING_DIM,
        ),
    )
    return result.embeddings[0].values


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Batch embed multiple texts in parallel (for post-meeting processing)."""
    if not texts:
        return []

    results = [None] * len(texts)
    uncached_texts = []
    uncached_indices = []

    for i, t in enumerate(texts):
        cached = _get_from_cache(t)
        if cached:
            results[i] = cached
        else:
            uncached_texts.append(t)
            uncached_indices.append(i)

    if not uncached_texts:
        return results

    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY in [
        "your-gemini-api-key",
        "mock-key",
    ]:
        for i, idx in enumerate(uncached_indices):
            vec = await _fallback_vector(uncached_texts[i])
            results[idx] = vec
            _set_in_cache(uncached_texts[i], vec)
        return results

    client = _get_client()
    batch_size = 20
    batches = [
        (
            uncached_texts[i : i + batch_size],
            uncached_indices[i : i + batch_size],
        )
        for i in range(0, len(uncached_texts), batch_size)
    ]

    async def _process_batch(b_texts, b_indices):
        try:
            try:
                res = await client.aio.models.embed_content(
                    model=settings.GEMINI_EMBEDDING_MODEL,
                    contents=b_texts,
                    config=genai_types.EmbedContentConfig(
                        task_type="RETRIEVAL_DOCUMENT",
                        output_dimensionality=settings.EMBEDDING_DIM,
                    ),
                )
            except Exception:
                res = await asyncio.to_thread(
                    client.models.embed_content,
                    model=settings.GEMINI_EMBEDDING_MODEL,
                    contents=b_texts,
                    config=genai_types.EmbedContentConfig(
                        task_type="RETRIEVAL_DOCUMENT",
                        output_dimensionality=settings.EMBEDDING_DIM,
                    ),
                )
            for j, emb in enumerate(res.embeddings):
                vec = emb.values
                results[b_indices[j]] = vec
                _set_in_cache(b_texts[j], vec)
        except Exception:
            for j, idx in enumerate(b_indices):
                try:
                    vec = await _fallback_vector(b_texts[j])
                    results[idx] = vec
                    _set_in_cache(b_texts[j], vec)
                except Exception:
                    pass

    await asyncio.gather(*[_process_batch(b_t, b_idx) for b_t, b_idx in batches])
    return results


def chunk_transcript(
    utterances: list[dict],
    chunk_size: int = 500,
    overlap: int = 100,
) -> list[dict]:
    """
    Semantic chunking: Convert utterances list into overlapping text chunks.
    Groups consecutive utterances by the same speaker.
    Returns list of {text, speaker_name, timestamp_ms} dicts.
    """
    chunks = []
    current_text = []
    current_speaker = None
    current_ts = 0
    token_count = 0

    # First, group by speaker
    grouped_utterances = []
    for utt in utterances:
        speaker = utt.get("speaker", "Unknown")
        text = utt.get("text", "").strip()
        ts = utt.get("timestamp_ms", 0)

        if not grouped_utterances:
            grouped_utterances.append(
                {"speaker": speaker, "text": text, "timestamp_ms": ts}
            )
        else:
            last = grouped_utterances[-1]
            if last["speaker"] == speaker:
                last["text"] += f" {text}"
            else:
                grouped_utterances.append(
                    {"speaker": speaker, "text": text, "timestamp_ms": ts}
                )

    # Now apply size/overlap logic on the grouped utterances
    for utt in grouped_utterances:
        text = utt["text"]
        speaker = utt["speaker"]
        ts = utt["timestamp_ms"]

        line = f"{speaker}: {text}"
        tokens = len(line.split())

        if token_count + tokens > chunk_size and current_text:
            chunks.append(
                {
                    "text": "\n".join(current_text),
                    "speaker_name": current_speaker if current_speaker else "Multiple",
                    "timestamp_ms": current_ts,
                }
            )
            # Overlap handling (simplistic)
            if tokens > chunk_size:
                # If a single speaker's turn is massive, just start new
                current_text = []
                token_count = 0
            else:
                # Keep last turn as overlap if it fits
                last_line = current_text[-1]
                current_text = [last_line]
                token_count = len(last_line.split())

        if not current_text:
            current_ts = ts
            current_speaker = speaker
        elif current_speaker != speaker:
            current_speaker = "Multiple"

        current_text.append(line)
        token_count += tokens

    if current_text:
        chunks.append(
            {
                "text": "\n".join(current_text),
                "speaker_name": current_speaker if current_speaker else "Multiple",
                "timestamp_ms": current_ts,
            }
        )

    return chunks
