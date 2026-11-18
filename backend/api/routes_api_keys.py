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


from ..services.api_keys_adapters import (
    ValidationResult,
    _normalize_http_response,
    _normalize_exception,
    EXCLUDED_MODEL_PATTERNS,
    is_chat_model,
    KNOWN_MODEL_TITLES,
    format_model_name,
    _MODELS_CACHE,
    _MODELS_CACHE_TTL,
    get_cached_models,
    set_cached_models,
    ProviderAdapter,
    HttpProviderAdapter,
    OpenAIAdapter,
    AnthropicAdapter,
    GoogleAdapter,
    OpenRouterAdapter,
    GroqAdapter,
    PerplexityAdapter,
    MistralAdapter,
    DeepSeekAdapter,
    CustomAdapter,
    REGISTRY,
)


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
async def test_key_preflight(
    req: PreflightTestRequest,
    user: dict = Depends(get_current_user),
):
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
async def post_fetch_models(
    req: FetchModelsRequest,
    user: dict = Depends(get_current_user),
):
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
