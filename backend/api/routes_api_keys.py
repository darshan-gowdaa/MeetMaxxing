"""
API Keys management endpoints.
"""

import os
import httpx
from datetime import datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from ..core.auth import get_current_user
from ..core.database import get_supabase_admin
from ..core.config import settings

router = APIRouter(prefix="/api-keys", tags=["api_keys"])

def _get_kek() -> bytes:
    try: return bytes.fromhex(settings.KEK_SECRET)
    except Exception: return b"0" * 32

def _encrypt_key(plaintext_key: str) -> dict:
    dek = AESGCM.generate_key(bit_length=256)
    aesgcm_dek = AESGCM(dek)
    iv = os.urandom(12)
    ct_with_tag = aesgcm_dek.encrypt(iv, plaintext_key.encode(), None)
    
    kek = _get_kek()
    aesgcm_kek = AESGCM(kek)
    iv_kek = os.urandom(12)
    wrapped_dek_with_tag = aesgcm_kek.encrypt(iv_kek, dek, None)
    
    return {
        "key_ciphertext": ct_with_tag[:-16].hex(),
        "iv": iv.hex(),
        "auth_tag": ct_with_tag[-16:].hex(),
        "wrapped_dek": (iv_kek + wrapped_dek_with_tag).hex(),
        "kms_key_id": "local_kek_v1",
        "last4": plaintext_key[-4:] if len(plaintext_key) > 4 else plaintext_key
    }

def _decrypt_key(record: dict) -> str:
    kek = _get_kek()
    aesgcm_kek = AESGCM(kek)
    wrapped_dek_full = bytes.fromhex(record["wrapped_dek"])
    dek = aesgcm_kek.decrypt(wrapped_dek_full[:12], wrapped_dek_full[12:], None)
    
    aesgcm_dek = AESGCM(dek)
    return aesgcm_dek.decrypt(
        bytes.fromhex(record["iv"]),
        bytes.fromhex(record["key_ciphertext"]) + bytes.fromhex(record["auth_tag"]),
        None
    ).decode()

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
        "last_checked_at": datetime.utcnow().isoformat(),
        "last_error_message_safe": error_msg if status != "valid" else None
    }).eq("id", key_id).execute()

@router.get("/")
async def list_keys(user: dict = Depends(get_current_user)):
    res = get_supabase_admin().table("user_api_keys").select("id, provider_id, label, last4, status, last_checked_at, last_error_message_safe, is_default_for_provider").eq("user_id", user["id"]).execute()
    return {"api_keys": res.data or []}

@router.post("/")
async def add_key(data: dict, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    provider_id, key = data.get("provider_id"), data.get("key")
    if not provider_id or not key: raise HTTPException(400, "Missing data")
        
    try:
        enc_data = _encrypt_key(key)
        enc_data.update({"user_id": user["id"], "provider_id": provider_id, "label": data.get("label", ""), "status": "unchecked"})
        res = get_supabase_admin().table("user_api_keys").insert(enc_data).execute()
        key_record = res.data[0]
        background_tasks.add_task(async_status_check, key_record["id"], provider_id, key)
        return {"api_key": {k: v for k, v in key_record.items() if k not in ["key_ciphertext", "iv", "auth_tag", "wrapped_dek"]}}
    except Exception as e:
        raise HTTPException(500, f"Internal Error: {str(e)}")

@router.post("/{key_id}/check-status")
async def check_status(key_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    res = supabase.table("user_api_keys").select("*").eq("id", key_id).eq("user_id", user["id"]).execute()
    if not res.data: raise HTTPException(404, "Not found")
    
    pt = _decrypt_key(res.data[0])
    provider = REGISTRY.get(res.data[0]["provider_id"])
    status, err = await provider.validate(pt) if provider and hasattr(provider, 'validate') else ("valid", "")
    
    supabase.table("user_api_keys").update({"status": status, "last_checked_at": datetime.utcnow().isoformat(), "last_error_message_safe": err}).eq("id", key_id).execute()
    return {"status": status, "error": err}

@router.delete("/{key_id}")
async def delete_key(key_id: str, user: dict = Depends(get_current_user)):
    get_supabase_admin().table("user_api_keys").delete().eq("id", key_id).eq("user_id", user["id"]).execute()
    return {"status": "deleted"}

@router.get("/providers")
async def get_providers():
    return {"providers": [{"id": p.id, "name": p.name, "docs_url": p.docs_url, "pattern": p.pattern, "pricing": p.pricing} for p in REGISTRY.values()]}
