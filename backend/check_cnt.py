import asyncio
from qdrant_client import AsyncQdrantClient

async def check():
    c = AsyncQdrantClient(path="./qdrant_data")
    try:
        res = await c.count('meetmaxxing_memories')
        print("COUNT:", res.count)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(check())
