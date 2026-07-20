import redis.asyncio as aioredis
from .config import settings

_pool: aioredis.ConnectionPool | None = None
_memory_store: dict[str, list[str]] = {}
_is_fallback: bool | None = None


class MemoryRedis:
    async def get(self, key: str) -> str | None:
        val = _memory_store.get(key)
        if isinstance(val, list):
            return val[0] if val else None
        return val

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        _memory_store[key] = value
        return True

    async def rpush(self, key: str, value: str) -> int:
        if key not in _memory_store or not isinstance(_memory_store[key], list):
            _memory_store[key] = []
        _memory_store[key].append(value)
        return len(_memory_store[key])

    async def rpop(self, key: str) -> str | None:
        if key in _memory_store and isinstance(_memory_store[key], list) and _memory_store[key]:
            return _memory_store[key].pop()
        return None

    async def lrange(self, key: str, start: int, end: int) -> list[str]:
        items = _memory_store.get(key, [])
        if not isinstance(items, list):
            return []
        if end == -1:
            return items[start:] if start < 0 else items[start:]
        elif start < 0 and end == -1:
            return items[start:]
        return items[start : end + 1] if end >= 0 else items[start:]

    async def expire(self, key: str, ttl: int) -> bool:
        return True

    async def aclose(self) -> None:
        pass


def get_redis_pool() -> aioredis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = aioredis.ConnectionPool.from_url(
            settings.REDIS_URL,
            password=settings.REDIS_PASSWORD or None,
            decode_responses=True,
            max_connections=20,
            socket_connect_timeout=1.0,
        )
    return _pool


def get_redis() -> aioredis.Redis | MemoryRedis:
    global _is_fallback
    if _is_fallback or settings.REDIS_URL in ["memory", "local", ""]:
        return MemoryRedis()
    return aioredis.Redis(connection_pool=get_redis_pool())


async def _get_active_redis() -> aioredis.Redis | MemoryRedis:
    global _is_fallback
    if _is_fallback or settings.REDIS_URL in ["memory", "local", ""]:
        return MemoryRedis()
    r = aioredis.Redis(connection_pool=get_redis_pool())
    try:
        await r.ping()
        return r
    except Exception:
        _is_fallback = True
        return MemoryRedis()


# ─── transcript helpers ────────────────────────────────────────────────────────

TRANSCRIPT_TTL = 60 * 60 * 8  # 8 hours


async def set_meeting_alias(id1: str, id2: str) -> None:
    """Link UUID meeting ID and Google Meet code alias in Redis."""
    if not id1 or not id2 or id1 == id2:
        return
    r = await _get_active_redis()
    await r.set(f"meeting_alias:{id1}", id2, ex=TRANSCRIPT_TTL)
    await r.set(f"meeting_alias:{id2}", id1, ex=TRANSCRIPT_TTL)
    await r.aclose()


async def append_transcript_chunk(meeting_id: str, chunk: dict) -> None:
    """Append a serialized transcript chunk to the live meeting Redis list with deduplication."""
    import json
    r = await _get_active_redis()
    key = f"transcript:{meeting_id}"
    
    last_raw = await r.lrange(key, -1, -1)
    if last_raw:
        try:
            last_item = json.loads(last_raw[0])
            if last_item.get("speaker") == chunk.get("speaker"):
                last_text = last_item.get("text", "").strip()
                new_text = chunk.get("text", "").strip()
                # Exact duplicate or older prefix update -> ignore
                if last_text == new_text or last_text.startswith(new_text):
                    await r.aclose()
                    return
                # Expanded continuation -> replace last entry in place instead of creating duplicate lines
                if new_text.startswith(last_text) or (len(new_text) > len(last_text) and new_text[:15] == last_text[:15]):
                    if isinstance(r, MemoryRedis):
                        _memory_store[key][-1] = json.dumps(chunk)
                    else:
                        await r.rpop(key)
                        await r.rpush(key, json.dumps(chunk))
                    await r.expire(key, TRANSCRIPT_TTL)
                    await r.aclose()
                    return
        except Exception:
            pass

    await r.rpush(key, json.dumps(chunk))
    await r.expire(key, TRANSCRIPT_TTL)

    # Also push to alias key if present
    alias = await r.get(f"meeting_alias:{meeting_id}")
    if alias:
        await r.rpush(f"transcript:{alias}", json.dumps(chunk))
        await r.expire(f"transcript:{alias}", TRANSCRIPT_TTL)

    await r.aclose()


async def get_transcript_window(meeting_id: str, last_n: int = 50) -> list[dict]:
    """Fetch last N transcript chunks for the rolling window."""
    import json
    r = await _get_active_redis()
    key = f"transcript:{meeting_id}"
    raw = await r.lrange(key, -last_n, -1)
    if not raw:
        alias = await r.get(f"meeting_alias:{meeting_id}")
        if alias:
            raw = await r.lrange(f"transcript:{alias}", -last_n, -1)
    await r.aclose()
    return [json.loads(item) for item in raw]


async def get_full_transcript(meeting_id: str) -> list[dict]:
    """Fetch entire transcript from Redis (used at meeting end)."""
    import json
    r = await _get_active_redis()
    key = f"transcript:{meeting_id}"
    raw = await r.lrange(key, 0, -1)
    if not raw:
        alias = await r.get(f"meeting_alias:{meeting_id}")
        if alias:
            raw = await r.lrange(f"transcript:{alias}", 0, -1)
    await r.aclose()
    return [json.loads(item) for item in raw]
