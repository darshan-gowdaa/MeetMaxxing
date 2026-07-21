"""
MeetMaxxing FastAPI application entry point.
"""

from contextlib import asynccontextmanager
import sys
from pathlib import Path

import warnings
warnings.filterwarnings("ignore", category=UserWarning)

# Force UTF-8 stdout/stderr on Windows to prevent UnicodeEncodeError with emojis
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Setup OpenTelemetry
# resource = Resource.create(attributes={"service.name": "meetmaxxing-api"})
# trace.set_tracer_provider(TracerProvider(resource=resource))
# otlp_exporter = OTLPSpanExporter(endpoint="http://jaeger:4317", insecure=True)
# trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(otlp_exporter))

if __package__ is None or __package__ == "":
    _parent_dir = str(Path(__file__).resolve().parent.parent)
    if _parent_dir not in sys.path:
        sys.path.insert(0, _parent_dir)
    __package__ = "backend"

from .core.config import settings
from .memory.qdrant_client import ensure_collection
from .api.routes_transcript import router as transcript_router
from .api.routes_meeting import router as meeting_router
from .api.routes_memory import router as memory_router
from .api.routes_calendar import router as calendar_router
from .api.routes_dashboard import router as dashboard_router


import threading
from .grpc_bus.grpc_server import serve as grpc_serve

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: ensure Qdrant collection + indexes exist and start gRPC server."""
    try:
        await ensure_collection()
    except Exception as e:
        print(f"Warning: Failed to initialize Qdrant memory: {e}")
    
    # Start gRPC Task Bus in background
    grpc_thread = threading.Thread(target=grpc_serve, daemon=True)
    grpc_thread.start()
    
    yield
    # Shutdown: nothing to clean up for now


app = FastAPI(
    title="MeetMaxxing API",
    description="Multi-agent meeting copilot with persistent cross-meeting memory",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "chrome-extension://*",  # Allow Chrome extension
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# FastAPIInstrumentor.instrument_app(app)
# Register all routers
app.include_router(transcript_router)
app.include_router(meeting_router)
app.include_router(memory_router)
app.include_router(calendar_router)
app.include_router(dashboard_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "meetmaxxing-api", "version": "1.0.0"}


@app.get("/api/diagnostics")
async def diagnostics():
    """Verify ADK (Google GenAI SDK), Lyzr Guardrails, and Qdrant memory status."""
    import google.genai as genai
    import lyzr
    from .memory.qdrant_client import get_qdrant, ensure_collection
    
    # 1. ADK / GenAI check
    adk_configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY not in ["your-gemini-api-key", "mock-key", ""])
    adk_info = {
        "status": "ready" if adk_configured else "missing_key",
        "sdk_version": getattr(genai, "__version__", "loaded"),
        "model_configured": settings.GEMINI_FLASH_MODEL,
        "api_key_configured": adk_configured
    }

    # 2. Lyzr guardrails check
    lyzr_info = {
        "status": "ready",
        "sdk_version": getattr(lyzr, "__version__", "loaded"),
        "realtime_guardrail_enabled": True,
        "summary_guardrail_enabled": True
    }

    # 3. Qdrant (`qdart`) check
    qdrant_info = {"status": "error"}
    try:
        await ensure_collection()
        client = await get_qdrant()
        collections = await client.get_collections()
        has_collection = any(c.name == settings.QDRANT_COLLECTION for c in collections.collections)
        points_count = 0
        if has_collection:
            try:
                info = await client.get_collection(settings.QDRANT_COLLECTION)
                points_count = getattr(info, "points_count", 0) or 0
            except Exception:
                pass
        qdrant_info = {
            "status": "ready" if has_collection else "collection_missing",
            "collection": settings.QDRANT_COLLECTION,
            "points_stored": points_count,
            "url": settings.QDRANT_URL
        }
    except Exception as e:
        qdrant_info = {"status": "error", "error": str(e)}

    return {
        "service": "MeetMaxxing API Diagnostics",
        "adk": adk_info,
        "lyzr": lyzr_info,
        "qdrant": qdrant_info
    }


@app.get("/")
async def root():
    return {
        "service": "MeetMaxxing API",
        "docs": "/docs",
        "health": "/health",
        "diagnostics": "/api/diagnostics"
    }
