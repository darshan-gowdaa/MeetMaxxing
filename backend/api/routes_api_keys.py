"""
API Keys management endpoints.
"""

import os
import httpx
from datetime import UTC, datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from loguru import logger
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from ..core.auth import get_current_user
from ..core.database import get_supabase_admin
from ..core.config import settings
from ..core.byok import (
    get_kek as _get_kek,
    encrypt_key as _encrypt_key,
    decrypt_key as _decrypt_key,
    resolve_user_byok,
    invalidate_user_byok_cache,
)

router = APIRouter(prefix="/api-keys", tags=["api_keys"])

class ProviderAdapter:
    id: str = ""
    name: str = ""
    docs_url: str = ""
    pattern: str = ".*"
    pricing: str = "Paid"
    
    async def validate(self, key: str) -> tuple[str, str]:
        """Returns (status, safe_error_message)"""
        raise NotImplementedError

class HttpProviderAdapter(ProviderAdapter):
    check_url: str = ""
    auth_header: str = "Bearer {}"
    
    async def validate(self, key: str) -> tuple[str, str]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                headers = {"Authorization": self.auth_header.format(key)} if self.auth_header else {}
                r = await client.get(self.check_url, headers=headers)
                if r.status_code == 200: return "valid", ""
                if r.status_code == 401: return "invalid", "Unauthorized API key."
                if r.status_code == 429: return "rate_limited", "Rate limit exceeded."
                return "invalid", f"Provider error {r.status_code}"
        except Exception as e:
            return "unavailable", "Network or provider unavailable."

class OpenAIAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern = "openai", "OpenAI", "https://platform.openai.com/docs", "^sk-.*"
    check_url = "https://api.openai.com/v1/models"

class AnthropicAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern = "anthropic", "Anthropic", "https://docs.claude.com", "^sk-ant-.*"
    check_url = "https://api.anthropic.com/v1/models"
    async def validate(self, key: str):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(self.check_url, headers={"x-api-key": key, "anthropic-version": "2023-06-01"})
                if r.status_code == 200: return "valid", ""
                return "invalid", "Unauthorized API key."
        except Exception: return "unavailable", "Network unavailable."

class GoogleAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern = "google", "Google Gemini", "https://ai.google.dev/docs", "^AIza.*"
    check_url = "https://generativelanguage.googleapis.com/v1beta/models"
    pricing = "Free Tier"
    async def validate(self, key: str):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.check_url}?key={key}")
                if r.status_code == 200: return "valid", ""
                return "invalid", "Unauthorized API key."
        except Exception: return "unavailable", "Network unavailable."

class OpenRouterAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern = "openrouter", "OpenRouter", "https://openrouter.ai/docs", "^sk-or-v1-.*"
    check_url = "https://openrouter.ai/api/v1/auth/key"
    pricing = "Free Tier"

# Additional providers requested
class GroqAdapter(HttpProviderAdapter):
    id, name, docs_url, pattern, check_url = "groq", "Groq", "https://console.groq.com/docs", "^gsk_.*", "https://api.groq.com/openai/v1/models"
    pricing = "Free Tier"

class PerplexityAdapter(ProviderAdapter):
    id, name, docs_url, pattern = "perplexity", "Perplexity", "https://docs.perplexity.ai", "^pplx-.*"
    async def validate(self, key: str):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.post("https://api.perplexity.ai/chat/completions", headers={"Authorization": f"Bearer {key}"}, json={"model": "llama-3-8b-instruct", "messages": [{"role": "user", "content": "ping"}]})
                if r.status_code == 200: return "valid", ""
                return "invalid", "Unauthorized or invalid."
        except Exception: return "unavailable", "Network unavailable."

class MistralAdapter(HttpProviderAdapter): 
    id, name, docs_url, check_url = "mistral", "Mistral AI", "https://docs.mistral.ai", "https://api.mistral.ai/v1/models"
    pricing = "Free Tier"
class DeepSeekAdapter(HttpProviderAdapter): id, name, docs_url, check_url = "deepseek", "DeepSeek", "https://platform.deepseek.com", "https://api.deepseek.com/models"
class CustomAdapter(ProviderAdapter): id, name, docs_url = "custom", "Custom", ""

REGISTRY: dict[str, ProviderAdapter] = {p.id: p() for p in [
    OpenAIAdapter, AnthropicAdapter, GoogleAdapter, OpenRouterAdapter, 
    GroqAdapter, PerplexityAdapter, MistralAdapter, DeepSeekAdapter, CustomAdapter
]}

async def async_status_check(key_id: str, provider_id: str, plaintext_key: str):
    provider = REGISTRY.get(provider_id)
    status, error_msg = ("invalid", "Unknown provider")
    if provider:
        status, error_msg = await provider.validate(plaintext_key) if hasattr(provider, 'validate') else ("valid", "")
        
    supabase = get_supabase_admin()
    supabase.table("user_api_keys").update({
        "status": status,
        "last_checked_at": datetime.now(UTC).isoformat(),
        "last_error_message_safe": error_msg if status != "valid" else None
    }).eq("id", key_id).execute()

@router.get("/")
async def list_keys(user: dict = Depends(get_current_user)):
    res = get_supabase_admin().table("user_api_keys").select("id, provider_id, label, last4, status, last_checked_at, last_error_message_safe, is_default_for_provider").eq("user_id", user["user_id"]).execute()
    return {"api_keys": res.data or []}

@router.post("/")
async def add_key(data: dict, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    provider_id, key = data.get("provider_id"), data.get("key")
    if not provider_id or not key: raise HTTPException(400, "Missing data")
        
    try:
        enc_data = _encrypt_key(key)
        enc_data.update({"user_id": user["user_id"], "provider_id": provider_id, "label": data.get("label", ""), "status": "unchecked"})
        res = get_supabase_admin().table("user_api_keys").upsert(enc_data, on_conflict="user_id,provider_id,label").execute()
        key_record = res.data[0]
        background_tasks.add_task(async_status_check, key_record["id"], provider_id, key)
        invalidate_user_byok_cache(user["user_id"])
        return {"api_key": {k: v for k, v in key_record.items() if k not in ["key_ciphertext", "iv", "auth_tag", "wrapped_dek"]}}
    except Exception as e:
        logger.error("Error adding key: {}", e)
        raise HTTPException(500, "Internal Error while saving key")

@router.post("/{key_id}/check-status")
async def check_status(key_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    res = supabase.table("user_api_keys").select("*").eq("id", key_id).eq("user_id", user["user_id"]).execute()
    if not res.data: raise HTTPException(404, "Not found")
    
    pt = _decrypt_key(res.data[0])
    provider = REGISTRY.get(res.data[0]["provider_id"])
    status, err = await provider.validate(pt) if provider and hasattr(provider, 'validate') else ("valid", "")
    
    supabase.table("user_api_keys").update({"status": status, "last_checked_at": datetime.now(UTC).isoformat(), "last_error_message_safe": err}).eq("id", key_id).execute()
    invalidate_user_byok_cache(user["user_id"])
    return {"status": status, "error": err}

@router.delete("/{key_id}")
async def delete_key(key_id: str, user: dict = Depends(get_current_user)):
    get_supabase_admin().table("user_api_keys").delete().eq("id", key_id).eq("user_id", user["user_id"]).execute()
    invalidate_user_byok_cache(user["user_id"])
    return {"status": "deleted"}

@router.get("/providers")
async def get_providers():
    return {"providers": [{"id": p.id, "name": p.name, "docs_url": p.docs_url, "pattern": p.pattern, "pricing": p.pricing} for p in REGISTRY.values()]}

@router.get("/model-preferences")
async def get_model_preferences(user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    res = supabase.table("user_model_preferences").select("*").eq("user_id", user["user_id"]).eq("feature_scope", "default_chat").execute()
    data = dict(res.data[0]) if res.data else {"mode": "manual", "model_id": ""}
    
    byok_cfg = await resolve_user_byok(user["user_id"])
    if byok_cfg:
        data["active_label"] = f"BYOK: {byok_cfg['provider'].capitalize()} ({byok_cfg['model'] or 'default'})"
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
async def update_model_preferences(updates: dict, user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    mode = updates.get("mode")
    model_id = updates.get("model_id")
    
    data = {"user_id": user["user_id"], "feature_scope": "default_chat"}
    if mode: data["mode"] = mode
    if model_id is not None: data["model_id"] = model_id
    
    res = supabase.table("user_model_preferences").upsert(data, on_conflict="user_id,feature_scope").execute()
    invalidate_user_byok_cache(user["user_id"])
    return res.data[0] if res.data else {}

