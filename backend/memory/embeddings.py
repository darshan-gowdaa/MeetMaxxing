from google import genai
from google.genai import types as genai_types
from ..core.config import settings
import hashlib
from functools import lru_cache

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


async def _fallback_vector(text: str) -> list[float]:
    # Generate deterministic pseudo-random embedding vector from hash of text
    h = hashlib.sha256(text.encode('utf-8')).digest()
    vals = [(b / 255.0) * 2 - 1 for b in h]
    while len(vals) < settings.EMBEDDING_DIM:
        vals.extend(vals[:settings.EMBEDDING_DIM - len(vals)])
    return vals[:settings.EMBEDDING_DIM]

# Simple in-memory LRU cache for embeddings
@lru_cache(maxsize=500)
def _get_cached_embedding(text: str) -> list[float] | None:
    return None # We use this just for the decorator, but async makes it tricky. We'll implement a custom async cache instead.

_embed_cache = {}
_embed_cache_keys = []
CACHE_MAX_SIZE = 500

def _get_from_cache(text: str):
    return _embed_cache.get(text)

def _set_in_cache(text: str, vector: list[float]):
    if text in _embed_cache:
        _embed_cache_keys.remove(text)
    _embed_cache[text] = vector
    _embed_cache_keys.append(text)
    if len(_embed_cache_keys) > CACHE_MAX_SIZE:
        oldest = _embed_cache_keys.pop(0)
        del _embed_cache[oldest]

async def embed_text(text: str) -> list[float]:
    """Embed a single text string using Gemini text-embedding-004."""
    cached = _get_from_cache(text)
    if cached:
        return cached

    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY in ["your-gemini-api-key", "mock-key"]:
        vec = await _fallback_vector(text)
        _set_in_cache(text, vec)
        return vec
        
    try:
        client = _get_client()
        result = client.models.embed_content(
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
    except Exception:
        vec = await _fallback_vector(text)
        _set_in_cache(text, vec)
        return vec


async def embed_query(text: str) -> list[float]:
    """Embed a query string (different task_type for better retrieval recall)."""
    # Note: query embeddings might not be cached since they are highly variable and context-dependent
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY in ["your-gemini-api-key", "mock-key"]:
        return await _fallback_vector(text)
    try:
        client = _get_client()
        result = client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=genai_types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=settings.EMBEDDING_DIM,
            ),
        )
        return result.embeddings[0].values
    except Exception:
        return await _fallback_vector(text)


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Batch embed multiple texts (for post-meeting processing)."""
    if not texts:
        return []
        
    results = []
    
    # Check cache first to reduce batch size
    uncached_texts = []
    uncached_indices = []
    for i, t in enumerate(texts):
        cached = _get_from_cache(t)
        if cached:
            results.append(cached)
        else:
            results.append(None) # Placeholder
            uncached_texts.append(t)
            uncached_indices.append(i)
            
    if not uncached_texts:
        return results

    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY in ["your-gemini-api-key", "mock-key"]:
        for i, idx in enumerate(uncached_indices):
            vec = await _fallback_vector(uncached_texts[i])
            results[idx] = vec
            _set_in_cache(uncached_texts[i], vec)
        return results
        
    try:
        client = _get_client()
        # Batch in groups of 20
        batch_size = 20
        for i in range(0, len(uncached_texts), batch_size):
            batch = uncached_texts[i:i+batch_size]
            batch_indices = uncached_indices[i:i+batch_size]
            
            result = client.models.embed_content(
                model=settings.GEMINI_EMBEDDING_MODEL,
                contents=batch,
                config=genai_types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=settings.EMBEDDING_DIM,
                ),
            )
            
            for j, emb in enumerate(result.embeddings):
                vec = emb.values
                results[batch_indices[j]] = vec
                _set_in_cache(batch[j], vec)
                
        return results
    except Exception:
        for i, idx in enumerate(uncached_indices):
            vec = await _fallback_vector(uncached_texts[i])
            results[idx] = vec
            _set_in_cache(uncached_texts[i], vec)
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
            grouped_utterances.append({"speaker": speaker, "text": text, "timestamp_ms": ts})
        else:
            last = grouped_utterances[-1]
            if last["speaker"] == speaker:
                last["text"] += f" {text}"
            else:
                grouped_utterances.append({"speaker": speaker, "text": text, "timestamp_ms": ts})

    # Now apply size/overlap logic on the grouped utterances
    for utt in grouped_utterances:
        text = utt["text"]
        speaker = utt["speaker"]
        ts = utt["timestamp_ms"]

        line = f"{speaker}: {text}"
        tokens = len(line.split())

        if token_count + tokens > chunk_size and current_text:
            chunks.append({
                "text": "\n".join(current_text),
                "speaker_name": current_speaker if current_speaker else "Multiple",
                "timestamp_ms": current_ts,
            })
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
        chunks.append({
            "text": "\n".join(current_text),
            "speaker_name": current_speaker if current_speaker else "Multiple",
            "timestamp_ms": current_ts,
        })

    return chunks
