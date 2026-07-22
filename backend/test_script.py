import asyncio
import logging
from api.routes_meeting import _run_end_pipeline

logging.basicConfig(level=logging.ERROR)
asyncio.run(_run_end_pipeline('qzm-mvmy-erf', 'Test Meeting', [], None, '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'))
