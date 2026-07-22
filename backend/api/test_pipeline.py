import asyncio
from api.routes_meeting import _run_end_pipeline

async def main():
    await _run_end_pipeline('qzm-mvmy-erf', 'Test', [], None, '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111')

if __name__ == "__main__":
    asyncio.run(main())
