"""
MeetMaxxing FastAPI application entry point.
"""

import sys
import warnings
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Request, status
from fastapi.responses import JSONResponse
from loguru import logger

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

import threading

from .api.routes_auth import router as auth_router
from .api.routes_calendar import router as calendar_router
from .api.routes_context import router as context_router
from .api.routes_dashboard import router as dashboard_router
from .api.routes_meeting import router as meeting_router
from .api.routes_memory import router as memory_router
from .api.routes_transcript import router as transcript_router
from .core.config import settings
from .grpc_bus.grpc_server import serve as grpc_serve
from .memory.qdrant_client import ensure_collection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: ensure Qdrant collection + indexes exist and start gRPC server."""
    try:
        await ensure_collection()
    except Exception:
        pass
    
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
        "https://meetmaxxing.vercel.app",
    ],
    allow_origin_regex=r"^https://.*\.vercel\.app$|^moz-extension://.*$|^chrome-extension://.*$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Use repr() to avoid loguru KeyError when exc str contains {dict} syntax
    try:
        logger.error("Unhandled error: {}", repr(exc), exc_info=True)
    except Exception:
        pass
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred."}
    )

@app.middleware("http")
async def secure_headers_middleware(request: Request, call_next):
    # Skip on OPTIONS preflight — let CORS middleware handle it
    if request.method == "OPTIONS":
        return await call_next(request)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# FastAPIInstrumentor.instrument_app(app)
# Register all routers
app.include_router(auth_router)
app.include_router(transcript_router)
app.include_router(meeting_router)
app.include_router(memory_router)
app.include_router(calendar_router)
app.include_router(dashboard_router)
app.include_router(context_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "meetmaxxing-api", "version": "1.0.0"}


@app.get("/api/diagnostics")
async def diagnostics():
    """Verify ADK (Google GenAI SDK), Lyzr Guardrails, and Qdrant memory status."""
    import lyzr
    from google import genai

    from .memory.qdrant_client import ensure_collection, get_qdrant
    
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
