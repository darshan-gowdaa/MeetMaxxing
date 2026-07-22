import asyncio
import logging
from backend.api.routes_meeting import _run_end_pipeline

logging.basicConfig(level=logging.DEBUG)

async def test_pipeline():
    try:
        print("Running pipeline...")
        await _run_end_pipeline("test-meeting-id", "Test Meeting", ["test@example.com"], 5, None, "test-org", "test-user")
        print("Pipeline finished successfully.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"PIPELINE EXCEPTION: {e}")

if __name__ == "__main__":
    asyncio.run(test_pipeline())
