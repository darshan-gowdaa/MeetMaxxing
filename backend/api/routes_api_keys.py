"""
API Keys management endpoints.
"""

from datetime import UTC, datetime
import hashlib
import time
from typing import Any
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from loguru import logger

from ..core.auth import get_current_user
from ..core.database import get_supabase_admin
from ..core.byok import (
    encrypt_key as _encrypt_key,
    decrypt_key as _decrypt_key,
    resolve_user_byok,
    invalidate_user_byok_cache,
)

router = APIRouter(prefix="/api-keys", tags=["api_keys"])


class ValidationResult(tuple):
    """Backwards-compatible result that unpacks as (status, error_message)."""

    status: str
    error_message: str
    error_code: str
    latency_ms: int

    def __new__(
        cls,
        status: str,
        error_message: str = "",
        error_code: str = "",
        latency_ms: int = 0,
    ):
        obj = super().__new__(cls, (status, error_message))
        obj.status = status
        obj.error_message = error_message
        obj.error_code = error_code
        obj.latency_ms = latency_ms
        return obj

    @property
    def valid(self) -> bool:
        return self.status == "valid"


def _normalize_http_response(status_code: int, body_text: str) -> tuple[str, str, str]:
    """Returns (status, error_code, error_message) based on HTTP status and response body."""
    if status_code == 200:
        return ("valid", "", "")
    if status_code == 401:
        return ("invalid", "invalid_key", "Unauthorized API key.")
    if status_code == 403:
        return ("invalid", "invalid_key", "Forbidden or invalid API key.")
    if status_code == 429:
        lowered = body_text.lower()
        if any(
            k in lowered
            for k in [
                "insufficient_quota",
                "quota",
                "credit",
                "billing",
                "resource_exhausted",
                "balance",
                "exceeded your current quota",
            ]
        ):
            return (
                "rate_limited",
                "insufficient_quota",
                "Provider quota exhausted. Please check billing or credits.",
            )
        return (
            "rate_limited",
            "rate_limit_exceeded",
            "Rate limit exceeded. Please try again later.",
        )
    if status_code in (502, 503, 504):
        return (
            "unavailable",
            "provider_unavailable",
            "Provider service temporarily unavailable.",
        )
    if status_code == 400:
        lowered = body_text.lower()
        if (
            "api_key_invalid" in lowered
            or "key not valid" in lowered
            or "invalid api key" in lowered
        ):
            return ("invalid", "invalid_key", "Invalid API key.")
        return (
            "invalid",
            "provider_error_400",
            f"Provider error 400: {body_text[:120]}",
        )
    return ("invalid", f"provider_error_{status_code}", f"Provider error {status_code}")


def _normalize_exception(e: Exception) -> tuple[str, str, str]:
    """Returns (status, error_code, error_message) for network exceptions."""
    if isinstance(e, httpx.TimeoutException):
        return ("unavailable", "timeout", "Request timed out.")
    return ("unavailable", "provider_unavailable", "Network or provider unavailable.")


# Keywords used to exclude non-chat / auxiliary models (embeddings, TTS, moderation, etc.)
EXCLUDED_MODEL_PATTERNS = (
    "embedding",
    "embed",
    "whisper",
    "tts",
    "dall-e",
    "moderation",
    "davinci",
    "babbage",
    "curie",
    "ada",
    "canary",
    "realtime-preview",
    "transcription",
    "audio",
    "imagen",
    "rerank",
    "guard",
    "clip",
    "search",
    "similarity",
)


def is_chat_model(model_id: str, raw_info: dict | None = None) -> bool:
    """Filter to ensure model is suitable for chat/completions."""
    mid = model_id.lower()
    if any(k in mid for k in EXCLUDED_MODEL_PATTERNS):
        return False
    if raw_info and isinstance(raw_info, dict):
        methods = raw_info.get("supportedGenerationMethods")
        if methods and "generateContent" not in methods:
            return False
    return True


KNOWN_MODEL_TITLES: dict[str, str] = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-4": "GPT-4",
    "o1": "o1",
    "o1-mini": "o1-mini",
    "o1-preview": "o1-preview",
    "o3-mini": "o3-mini",
    "claude-3-7-sonnet-latest": "Claude 3.7 Sonnet",
    "claude-3-5-sonnet-latest": "Claude 3.5 Sonnet",
    "claude-3-5-sonnet": "Claude 3.5 Sonnet",
    "claude-3-5-haiku-latest": "Claude 3.5 Haiku",
    "claude-3-5-haiku": "Claude 3.5 Haiku",
    "claude-3-opus-latest": "Claude 3 Opus",
    "gemini-2.5-flash": "Gemini 2.5 Flash",
    "gemini-2.5-pro": "Gemini 2.5 Pro",
    "gemini-1.5-flash": "Gemini 1.5 Flash",
    "gemini-1.5-pro": "Gemini 1.5 Pro",
    "sonar": "Sonar",
    "sonar-pro": "Sonar Pro",
    "deepseek-chat": "DeepSeek Chat",
    "deepseek-reasoner": "DeepSeek Reasoner (R1)",
}


def format_model_name(model_id: str, raw_name: str | None = None) -> str:
    """Produce clean human-readable model name."""
    if raw_name and raw_name != model_id and not raw_name.startswith("models/"):
        return raw_name
    mid_low = model_id.lower().strip()
    if mid_low in KNOWN_MODEL_TITLES:
        return KNOWN_MODEL_TITLES[mid_low]
    name = model_id
    if name.startswith("models/"):
        name = name.replace("models/", "")
    parts = name.replace("-", " ").replace("_", " ").split()
    capitalized = []
    for p in parts:
        pl = p.lower()
        if pl in ("gpt", "ai", "llm", "api") or (
            any(c.isdigit() for c in p) and any(c.isalpha() for c in p) and len(p) <= 5
        ):
            capitalized.append(p.upper())
        elif any(c.isdigit() for c in p):
            capitalized.append(p.capitalize())
        else:
            capitalized.append(p.capitalize())
    return " ".join(capitalized)


# In-memory 10-minute cache for models per provider & key hash: cache_key -> (timestamp, models)
_MODELS_CACHE: dict[str, tuple[float, list[dict]]] = {}
_MODELS_CACHE_TTL = 600.0  # 10 minutes


def get_cached_models(cache_key: str) -> list[dict] | None:
    now = time.time()
    if cache_key in _MODELS_CACHE:
        ts, models = _MODELS_CACHE[cache_key]
        if now - ts < _MODELS_CACHE_TTL:
            return models
    return None


def set_cached_models(cache_key: str, models: list[dict]) -> None:
    _MODELS_CACHE[cache_key] = (time.time(), models)


class ProviderAdapter:
    id: str = ""
    name: str = ""
    docs_url: str = ""
    pattern: str = ".*"
    pricing: str = "Paid"

    async def validate(self, key: str) -> ValidationResult:
        """Returns ValidationResult (unpacks as status, safe_error_message)"""
        raise NotImplementedError

    async def fetch_models(self, key: str) -> list[dict]:
        """Fetch available chat/completion models from provider."""
        return []


class HttpProviderAdapter(ProviderAdapter):
    check_url: str = ""
    models_url: str = ""
    auth_header: str = "Bearer {}"

    async def validate(self, key: str) -> ValidationResult:
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                headers = (
                    {"Authorization": self.auth_header.format(key)}
                    if self.auth_header
                    else {}
                )
                r = await client.get(self.check_url, headers=headers)
                latency_ms = round((time.perf_counter() - t0) * 1000)
                status, err_code, err_msg = _normalize_http_response(
                    r.status_code, r.text
                )
                return ValidationResult(
                    status, err_msg, error_code=err_code, latency_ms=latency_ms
                )
        except Exception as e:
            latency_ms = round((time.perf_counter() - t0) * 1000)
            status, err_code, err_msg = _normalize_exception(e)
            return ValidationResult(
                status, err_msg, error_code=err_code, latency_ms=latency_ms
            )

    async def fetch_models(self, key: str) -> list[dict]:
        url = self.models_url or self.check_url
        if not url:
            return []
        headers = (
            {"Authorization": self.auth_header.format(key)} if self.auth_header else {}
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, headers=headers)
            if r.status_code != 200:
                return []
            data = r.json()
            raw_list = data.get("data", []) if isinstance(data, dict) else []
            models = []
            for item in raw_list:
                mid = item.get("id") if isinstance(item, dict) else str(item)
                if not mid or not is_chat_model(
                    mid, item if isinstance(item, dict) else None
                ):
                    continue
                cw = None
                if isinstance(item, dict):
                    cw = item.get("context_window") or item.get("context_length")
                m_dict: dict[str, Any] = {
                    "id": mid,
                    "name": format_model_name(
                        mid, item.get("name") if isinstance(item, dict) else None
                    ),
                }
                if cw:
                    m_dict["context_window"] = int(cw)
                models.append(m_dict)
            return models


class OpenAIAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern = (
        "openai",
        "OpenAI",
        "https://platform.openai.com/docs",
        "^sk-.*",
    )
    check_url = "https://api.openai.com/v1/models"
    models_url = "https://api.openai.com/v1/models"


class AnthropicAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern = (
        "anthropic",
        "Anthropic",
        "https://docs.claude.com",
        "^sk-ant-.*",
    )
    check_url = "https://api.anthropic.com/v1/models"

    async def validate(self, key: str) -> ValidationResult:
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(
                    self.check_url,
                    headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
                )
                latency_ms = round((time.perf_counter() - t0) * 1000)
                status, err_code, err_msg = _normalize_http_response(
                    r.status_code, r.text
                )
                return ValidationResult(
                    status, err_msg, error_code=err_code, latency_ms=latency_ms
                )
        except Exception as e:
            latency_ms = round((time.perf_counter() - t0) * 1000)
            status, err_code, err_msg = _normalize_exception(e)
            return ValidationResult(
                status, err_msg, error_code=err_code, latency_ms=latency_ms
            )

    async def fetch_models(self, key: str) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    self.check_url,
                    headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
                )
                if r.status_code == 200:
                    data = r.json()
                    raw_list = data.get("data", [])
                    models = []
                    for item in raw_list:
                        mid = item.get("id")
                        if not mid or not is_chat_model(mid, item):
                            continue
                        disp = item.get("display_name") or item.get("name")
                        models.append(
                            {
                                "id": mid,
                                "name": format_model_name(mid, disp),
                            }
                        )
                    if models:
                        return models
        except Exception:
            pass
        return [
            {"id": "claude-3-7-sonnet-latest", "name": "Claude 3.7 Sonnet"},
            {"id": "claude-3-5-sonnet-latest", "name": "Claude 3.5 Sonnet"},
            {"id": "claude-3-5-haiku-latest", "name": "Claude 3.5 Haiku"},
            {"id": "claude-3-opus-latest", "name": "Claude 3 Opus"},
        ]


class GoogleAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern = (
        "google",
        "Google Gemini",
        "https://ai.google.dev/docs",
        "^AIza.*",
    )
    check_url = "https://generativelanguage.googleapis.com/v1beta/models"
    pricing = "Free Tier"

    async def validate(self, key: str) -> ValidationResult:
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.check_url}?key={key}")
                latency_ms = round((time.perf_counter() - t0) * 1000)
                status, err_code, err_msg = _normalize_http_response(
                    r.status_code, r.text
                )
                return ValidationResult(
                    status, err_msg, error_code=err_code, latency_ms=latency_ms
                )
        except Exception as e:
            latency_ms = round((time.perf_counter() - t0) * 1000)
            status, err_code, err_msg = _normalize_exception(e)
            return ValidationResult(
                status, err_msg, error_code=err_code, latency_ms=latency_ms
            )

    async def fetch_models(self, key: str) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(f"{self.check_url}?key={key}")
                if r.status_code == 200:
                    data = r.json()
                    raw_list = data.get("models", [])
                    models = []
                    for item in raw_list:
                        name = item.get("name", "")
                        mid = (
                            name.replace("models/", "")
                            if name.startswith("models/")
                            else name
                        )
                        if not mid or not is_chat_model(mid, item):
                            continue
                        cw = item.get("inputTokenLimit")
                        disp = item.get("displayName")
                        m_dict: dict[str, Any] = {
                            "id": mid,
                            "name": format_model_name(mid, disp),
                        }
                        if cw:
                            m_dict["context_window"] = int(cw)
                        models.append(m_dict)
                    if models:
                        return models
        except Exception:
            pass
        return [
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "context_window": 1048576,
            },
            {
                "id": "gemini-2.5-pro",
                "name": "Gemini 2.5 Pro",
                "context_window": 2097152,
            },
            {
                "id": "gemini-1.5-flash",
                "name": "Gemini 1.5 Flash",
                "context_window": 1048576,
            },
            {
                "id": "gemini-1.5-pro",
                "name": "Gemini 1.5 Pro",
                "context_window": 2097152,
            },
        ]


class OpenRouterAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern = (
        "openrouter",
        "OpenRouter",
        "https://openrouter.ai/docs",
        "^sk-or-v1-.*",
    )
    check_url = "https://openrouter.ai/api/v1/auth/key"
    models_url = "https://openrouter.ai/api/v1/models"
    pricing = "Free Tier"

    async def fetch_models(self, key: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                self.models_url,
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code != 200:
                return []
            data = r.json()
            raw_list = data.get("data", [])
            models = []
            for item in raw_list:
                mid = item.get("id")
                if not mid or not is_chat_model(mid, item):
                    continue
                cw = item.get("context_length")
                name = item.get("name")
                m_dict: dict[str, Any] = {
                    "id": mid,
                    "name": name or format_model_name(mid),
                }
                if cw:
                    m_dict["context_window"] = int(cw)
                models.append(m_dict)
            return models


# Additional providers requested
class GroqAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern, check_url = (
        "groq",
        "Groq",
        "https://console.groq.com/docs",
        "^gsk_.*",
        "https://api.groq.com/openai/v1/models",
    )
    models_url = "https://api.groq.com/openai/v1/models"
    pricing = "Free Tier"


class PerplexityAdapter(ProviderAdapter):
    id, name, docs_url, pattern = (
        "perplexity",
        "Perplexity",
        "https://docs.perplexity.ai",
        "^pplx-.*",
    )

    async def validate(self, key: str) -> ValidationResult:
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.post(
                    "https://api.perplexity.ai/chat/completions",
                    headers={"Authorization": f"Bearer {key}"},
                    json={
                        "model": "sonar",
                        "messages": [{"role": "user", "content": "ping"}],
                    },
                )
                latency_ms = round((time.perf_counter() - t0) * 1000)
                status, err_code, err_msg = _normalize_http_response(
                    r.status_code, r.text
                )
                return ValidationResult(
                    status, err_msg, error_code=err_code, latency_ms=latency_ms
                )
        except Exception as e:
            latency_ms = round((time.perf_counter() - t0) * 1000)
            status, err_code, err_msg = _normalize_exception(e)
            return ValidationResult(
                status, err_msg, error_code=err_code, latency_ms=latency_ms
            )

    async def fetch_models(self, key: str) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    "https://api.perplexity.ai/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
                if r.status_code == 200:
                    data = r.json()
                    raw_list = data.get("data", [])
                    models = []
                    for item in raw_list:
                        mid = item.get("id")
                        if not mid or not is_chat_model(mid, item):
                            continue
                        models.append(
                            {
                                "id": mid,
                                "name": format_model_name(mid, item.get("name")),
                            }
                        )
                    if models:
                        return models
        except Exception:
            pass
        return [
            {"id": "sonar", "name": "Sonar (Online)", "context_window": 127072},
            {"id": "sonar-pro", "name": "Sonar Pro (Online)", "context_window": 200000},
            {
                "id": "sonar-reasoning",
                "name": "Sonar Reasoning",
                "context_window": 127072,
            },
            {
                "id": "sonar-reasoning-pro",
                "name": "Sonar Reasoning Pro",
                "context_window": 127072,
            },
        ]


class MistralAdapter(HttpProviderAdapter):
    id, name, docs_url, check_url = (
        "mistral",
        "Mistral AI",
        "https://docs.mistral.ai",
        "https://api.mistral.ai/v1/models",
    )
    models_url = "https://api.mistral.ai/v1/models"
    pricing = "Free Tier"


class DeepSeekAdapter(HttpProviderAdapter):
    id, name, docs_url, check_url = (
        "deepseek",
        "DeepSeek",
        "https://platform.deepseek.com",
        "https://api.deepseek.com/models",
    )
    models_url = "https://api.deepseek.com/models"


class CustomAdapter(ProviderAdapter):
    id, name, docs_url = "custom", "Custom", ""

    async def validate(self, key: str) -> ValidationResult:
        if key and len(key.strip()) > 0:
            return ValidationResult("valid", "", latency_ms=0)
        return ValidationResult(
            "invalid", "Empty key provided.", error_code="invalid_key", latency_ms=0
        )

    async def fetch_models(self, key: str) -> list[dict]:
        return []


REGISTRY: dict[str, ProviderAdapter] = {
    p.id: p()
    for p in [
        OpenAIAdapter,
        AnthropicAdapter,
        GoogleAdapter,
        OpenRouterAdapter,
        GroqAdapter,
        PerplexityAdapter,
        MistralAdapter,
        DeepSeekAdapter,
        CustomAdapter,
    ]
}


async def async_status_check(key_id: str, provider_id: str, plaintext_key: str):
    provider = REGISTRY.get(provider_id)
    status, error_msg = ("invalid", "Unknown provider")
    if provider:
        val_res = (
            await provider.validate(plaintext_key)
            if hasattr(provider, "validate")
            else ("valid", "")
        )
        status = getattr(val_res, "status", val_res[0])
        error_msg = getattr(
            val_res, "error_message", val_res[1] if len(val_res) > 1 else ""
        )

    supabase = get_supabase_admin()
    supabase.table("user_api_keys").update(
        {
            "status": status,
            "last_checked_at": datetime.now(UTC).isoformat(),
            "last_error_message_safe": error_msg if status != "valid" else None,
        }
    ).eq("id", key_id).execute()


class PreflightTestRequest(BaseModel):
    provider_id: str
    api_key: str = ""
    key: str = ""


@router.post("/test")
async def test_key_preflight(req: PreflightTestRequest):
    """
    Transient preflight test endpoint testing key in-memory without persisting to DB.
    Measures latency in milliseconds and normalizes provider errors.
    """
    provider_id = (req.provider_id or "").strip().lower()
    api_key = (req.api_key or req.key or "").strip()
    if not provider_id or not api_key:
        raise HTTPException(400, "Missing provider_id or api_key")

    provider = REGISTRY.get(provider_id)
    if not provider:
        return {
            "valid": False,
            "status": "invalid",
            "latency_ms": 0,
            "error_code": "unknown_provider",
            "error": f"Unknown provider: {provider_id}",
        }

    try:
        res = await provider.validate(api_key)
        return {
            "valid": res.valid if hasattr(res, "valid") else (res[0] == "valid"),
            "status": getattr(res, "status", res[0]),
            "latency_ms": getattr(res, "latency_ms", 0),
            "error_code": getattr(res, "error_code", None) or None,
            "error": getattr(res, "error_message", res[1] if len(res) > 1 else None)
            or None,
        }
    except Exception as e:
        logger.error("[BYOK] Preflight test error: {}", e)
        status, err_code, err_msg = _normalize_exception(e)
        return {
            "valid": False,
            "status": status,
            "latency_ms": 0,
            "error_code": err_code,
            "error": err_msg,
        }


class FetchModelsRequest(BaseModel):
    provider_id: str
    api_key: str = ""
    key: str = ""


@router.post("/models")
async def post_fetch_models(req: FetchModelsRequest):
    """
    Fetch available models with an unsaved key during preflight/modal testing.
    Caches results in memory for 10 minutes to avoid rate limit spam.
    """
    provider_id = (req.provider_id or "").strip().lower()
    api_key = (req.api_key or req.key or "").strip()
    if not provider_id or not api_key:
        raise HTTPException(400, "Missing provider_id or api_key")

    provider = REGISTRY.get(provider_id)
    if not provider:
        raise HTTPException(404, f"Unknown provider: {provider_id}")

    cache_key = f"{provider_id}:{hashlib.sha256(api_key.encode()).hexdigest()[:16]}"
    cached = get_cached_models(cache_key)
    if cached is not None:
        return {"models": cached}

    try:
        models = await provider.fetch_models(api_key)
        set_cached_models(cache_key, models)
        return {"models": models}
    except Exception as e:
        logger.error("[BYOK] Error fetching models for provider {}: {}", provider_id, e)
        raise HTTPException(502, f"Failed to fetch models from provider: {e}")


async def _fetch_user_models_for_provider(provider_id: str, user_id: str) -> dict:
    pid = provider_id.strip().lower()
    provider = REGISTRY.get(pid)
    if not provider:
        raise HTTPException(404, f"Unknown provider: {pid}")

    supabase = get_supabase_admin()
    res = (
        supabase.table("user_api_keys")
        .select("*")
        .eq("user_id", user_id)
        .eq("provider_id", pid)
        .neq("status", "invalid")
        .execute()
    )
    keys = res.data or []
    if not keys:
        raise HTTPException(404, f"No active API key found for provider '{pid}'")

    # Pick default key if marked default, else first available
    key_record = next(
        (k for k in keys if k.get("is_default_for_provider")),
        keys[0],
    )
    plaintext_key = _decrypt_key(key_record)

    cache_key = f"{pid}:{hashlib.sha256(plaintext_key.encode()).hexdigest()[:16]}"
    cached = get_cached_models(cache_key)
    if cached is not None:
        return {"models": cached}

    try:
        models = await provider.fetch_models(plaintext_key)
        set_cached_models(cache_key, models)
        return {"models": models}
    except Exception as e:
        logger.error("[BYOK] Error fetching models for user key: {}", e)
        raise HTTPException(502, f"Failed to fetch models from provider: {e}")


@router.get("/models")
async def get_models_by_query(
    provider_id: str,
    user: dict = Depends(get_current_user),
):
    """Fetch available models for a provider using user's saved key (query param)."""
    return await _fetch_user_models_for_provider(provider_id, user["user_id"])


@router.get("/{provider_id}/models")
async def get_models_by_path(
    provider_id: str,
    user: dict = Depends(get_current_user),
):
    """Fetch available models for a provider using user's saved key (path param)."""
    return await _fetch_user_models_for_provider(provider_id, user["user_id"])


@router.get("/")
async def list_keys(user: dict = Depends(get_current_user)):
    res = (
        get_supabase_admin()
        .table("user_api_keys")
        .select(
            "id, provider_id, label, last4, status, last_checked_at, last_error_message_safe, is_default_for_provider"
        )
        .eq("user_id", user["user_id"])
        .execute()
    )
    return {"api_keys": res.data or []}


@router.post("/")
async def add_key(
    data: dict,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    provider_id, key = data.get("provider_id"), data.get("key")
    if not provider_id or not key:
        raise HTTPException(400, "Missing data")

    try:
        raw_label = (data.get("label") or "").strip()
        label = (
            raw_label
            if raw_label
            else f"{provider_id.capitalize()} Key {datetime.now().strftime('%b %d %H:%M')}"
        )

        enc_data = _encrypt_key(key)
        enc_data.update(
            {
                "user_id": user["user_id"],
                "provider_id": provider_id,
                "label": label,
                "status": "unchecked",
            }
        )
        res = (
            get_supabase_admin()
            .table("user_api_keys")
            .upsert(enc_data, on_conflict="user_id,provider_id,label")
            .execute()
        )
        key_record = res.data[0]
        background_tasks.add_task(
            async_status_check, key_record["id"], provider_id, key
        )
        invalidate_user_byok_cache(user["user_id"])
        return {
            "api_key": {
                k: v
                for k, v in key_record.items()
                if k not in ["key_ciphertext", "iv", "auth_tag", "wrapped_dek"]
            }
        }
    except Exception as e:
        logger.error("Error adding key: {}", e)
        raise HTTPException(500, "Internal Error while saving key")


@router.post("/{key_id}/check-status")
async def check_status(key_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    res = (
        supabase.table("user_api_keys")
        .select("*")
        .eq("id", key_id)
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Not found")

    pt = _decrypt_key(res.data[0])
    provider = REGISTRY.get(res.data[0]["provider_id"])
    t0 = time.perf_counter()
    if provider and hasattr(provider, "validate"):
        val_res = await provider.validate(pt)
        status = getattr(val_res, "status", val_res[0])
        err = getattr(val_res, "error_message", val_res[1] if len(val_res) > 1 else "")
        latency_ms = getattr(
            val_res, "latency_ms", round((time.perf_counter() - t0) * 1000)
        )
    else:
        status, err = ("valid", "")
        latency_ms = round((time.perf_counter() - t0) * 1000)

    supabase.table("user_api_keys").update(
        {
            "status": status,
            "last_checked_at": datetime.now(UTC).isoformat(),
            "last_error_message_safe": err if status != "valid" else None,
        }
    ).eq("id", key_id).execute()
    invalidate_user_byok_cache(user["user_id"])
    return {"status": status, "error": err, "latency_ms": latency_ms}


@router.delete("/{key_id}")
async def delete_key(key_id: str, user: dict = Depends(get_current_user)):
    get_supabase_admin().table("user_api_keys").delete().eq("id", key_id).eq(
        "user_id", user["user_id"]
    ).execute()
    invalidate_user_byok_cache(user["user_id"])
    return {"status": "deleted"}


@router.get("/providers")
async def get_providers():
    return {
        "providers": [
            {
                "id": p.id,
                "name": p.name,
                "docs_url": p.docs_url,
                "pattern": p.pattern,
                "pricing": p.pricing,
            }
            for p in REGISTRY.values()
        ]
    }


@router.get("/model-preferences")
async def get_model_preferences(user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    res = (
        supabase.table("user_model_preferences")
        .select("*")
        .eq("user_id", user["user_id"])
        .eq("feature_scope", "default_chat")
        .execute()
    )
    data = dict(res.data[0]) if res.data else {"mode": "manual", "model_id": ""}

    byok_cfg = await resolve_user_byok(user["user_id"])
    if byok_cfg:
        data["active_label"] = (
            f"BYOK: {byok_cfg['provider'].capitalize()} ({byok_cfg['model'] or 'default'})"
        )
        data["is_byok"] = True
        data["resolved_provider"] = byok_cfg["provider"]
    else:
        m = data.get("mode", "manual")
        if m == "smart":
            data["active_label"] = "MeetMaxxing AI (Default)"
        else:
            data["active_label"] = "MeetMaxxing AI (No key connected)"
        data["is_byok"] = False
        data["resolved_provider"] = "default"
    return data


@router.patch("/model-preferences")
async def update_model_preferences(
    updates: dict, user: dict = Depends(get_current_user)
):
    supabase = get_supabase_admin()
    mode = updates.get("mode")
    model_id = updates.get("model_id")
    provider_credential_id = updates.get("provider_credential_id")

    data = {"user_id": user["user_id"], "feature_scope": "default_chat"}
    if mode:
        data["mode"] = mode
    if model_id is not None:
        data["model_id"] = model_id
    if provider_credential_id is not None:
        data["provider_credential_id"] = provider_credential_id

    res = (
        supabase.table("user_model_preferences")
        .upsert(data, on_conflict="user_id,feature_scope")
        .execute()
    )
    invalidate_user_byok_cache(user["user_id"])
    return res.data[0] if res.data else {}
