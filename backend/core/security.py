"""
Security middleware and production hardening utilities.
"""

import time
from collections import defaultdict

from fastapi import Request, status
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Per-IP sliding-window rate limiter for public/ingestion endpoints.
    Prevents DoS abuse of unauthenticated or high-frequency routes.
    """

    # Tuples of (window_seconds, max_requests)
    _INGESTION_LIMIT = (60, 120)   # 120 req/min on transcript ingest
    _DEFAULT_LIMIT = (60, 300)     # 300 req/min everywhere else
    _STRICT_LIMIT = (60, 30)       # 30 req/min on auth routes

    _STRICT_PREFIXES = ("/api/auth/",)
    _INGESTION_PREFIXES = ("/ingest/",)

    def __init__(self, app):
        super().__init__(app)
        # ip -> list of timestamps
        self._windows: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        # Honour X-Forwarded-For from reverse proxy (Render/Vercel)
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _limit_for(self, path: str) -> tuple[int, int]:
        for prefix in self._STRICT_PREFIXES:
            if path.startswith(prefix):
                return self._STRICT_LIMIT
        for prefix in self._INGESTION_PREFIXES:
            if path.startswith(prefix):
                return self._INGESTION_LIMIT
        return self._DEFAULT_LIMIT

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip WebSocket upgrades — they use their own connection lifecycle
        if request.headers.get("upgrade", "").lower() == "websocket":
            return await call_next(request)

        ip = self._get_client_ip(request)
        path = request.url.path
        window_s, max_req = self._limit_for(path)

        now = time.time()
        cutoff = now - window_s
        hits = self._windows[ip]

        # Prune expired timestamps
        while hits and hits[0] < cutoff:
            hits.pop(0)

        if len(hits) >= max_req:
            logger.warning("Rate limit exceeded: ip={} path={}", ip, path)
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(window_s)},
            )

        hits.append(now)
        return await call_next(request)


def validate_production_secrets() -> None:
    """
    Crash at startup if running in production with placeholder/insecure secrets.
    Call this from lifespan before serving any requests.
    """
    if settings.ENVIRONMENT not in ("production", "prod"):
        return

    insecure_kek = settings.KEK_SECRET in (
        "0000000000000000000000000000000000000000000000000000000000000000",
        "",
    )
    if insecure_kek:
        raise RuntimeError(
            "FATAL: KEK_SECRET is the zero-key default. "
            "Generate a random 64-char hex string and set it in your environment."
        )

    insecure_secret = settings.APP_SECRET_KEY in ("change-me-in-production", "")
    if insecure_secret:
        raise RuntimeError(
            "FATAL: APP_SECRET_KEY is the default placeholder. "
            "Set a strong random secret in your environment."
        )

    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("FATAL: SUPABASE_SERVICE_ROLE_KEY is required in production.")
