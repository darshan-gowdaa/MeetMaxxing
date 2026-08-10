import asyncio; from qdrant_client import AsyncQdrantClient; async def main(): c = AsyncQdrantClient(location=':memory:'); print('Success'); asyncio.run(main())
