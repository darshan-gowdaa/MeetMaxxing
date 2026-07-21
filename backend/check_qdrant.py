import asyncio
from memory.qdrant_client import get_qdrant

async def check():
    client = await get_qdrant()
    count = await client.count('meetmaxxing_memories')
    print("Count:", count)

asyncio.run(check())
