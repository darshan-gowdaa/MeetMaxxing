import os
import time
from typing import Any
import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from loguru import logger

from .config import settings
from .database import get_supabase_admin

# Cache for resolved BYOK configs: user_id -> (timestamp, byok_dict)
_BYOK_CACHE: dict[str, tuple[float, dict[str, Any] | None]] = {}
_CACHE_TTL_SECONDS = 30.0


def get_kek() -> bytes:
    # return KEK from settings or fallback default
    try:
        return bytes.fromhex(settings.KEK_SECRET)
    except Exception:
        return b"0" * 32


def encrypt_key(plaintext_key: str) -> dict:
    # aes-gcm encryption for api keys
    dek = AESGCM.generate_key(bit_length=256)
    aesgcm_dek = AESGCM(dek)
    iv = os.urandom(12)
    ct_with_tag = aesgcm_dek.encrypt(iv, plaintext_key.encode(), None)

    kek = get_kek()
    aesgcm_kek = AESGCM(kek)
    iv_kek = os.urandom(12)
    wrapped_dek_with_tag = aesgcm_kek.encrypt(iv_kek, dek, None)

    return {
        "key_ciphertext": ct_with_tag[:-16].hex(),
        "iv": iv.hex(),
        "auth_tag": ct_with_tag[-16:].hex(),
        "wrapped_dek": (iv_kek + wrapped_dek_with_tag).hex(),
        "kms_key_id": "local_kek_v1",
        "last4": plaintext_key[-4:] if len(plaintext_key) > 4 else plaintext_key,
    }


def decrypt_key(record: dict) -> str:
    # aes-gcm decryption for saved api keys
    kek = get_kek()
    aesgcm_kek = AESGCM(kek)
    wrapped_dek_full = bytes.fromhex(record["wrapped_dek"])
    dek = aesgcm_kek.decrypt(wrapped_dek_full[:12], wrapped_dek_full[12:], None)

    aesgcm_dek = AESGCM(dek)
    return aesgcm_dek.decrypt(
        bytes.fromhex(record["iv"]),
        bytes.fromhex(record["key_ciphertext"]) + bytes.fromhex(record["auth_tag"]),
        None,
    ).decode()


def invalidate_user_byok_cache(user_id: str) -> None:
    # purge cached byok status when settings change
    if user_id in _BYOK_CACHE:
        del _BYOK_CACHE[user_id]


def _infer_provider_from_model(model_id: str) -> str:
    m = model_id.lower().strip()
    if "claude" in m:
        return "anthropic"
    if "gemini" in m:
        return "google"
    if "gpt" in m or "o1" in m or "o3" in m:
        return "openai"
    if "llama" in m:
        return "groq"
    if "sonar" in m:
        return "perplexity"
    if "deepseek" in m:
        return "deepseek"
    if "mistral" in m:
        return "mistral"
    if "openrouter" in m:
        return "openrouter"
    return ""


async def resolve_user_byok(user_id: str | None) -> dict[str, Any] | None:
    # reads user preference and resolves decrypted key if manual mode is on
    if not user_id:
        return None

    now = time.time()
    if user_id in _BYOK_CACHE:
        ts, cached_val = _BYOK_CACHE[user_id]
        if now - ts < _CACHE_TTL_SECONDS:
            return cached_val

    try:
        supabase = get_supabase_admin()
        # 1. Fetch user model preferences
        pref_res = (
            supabase.table("user_model_preferences")
            .select("mode, model_id")
            .eq("user_id", user_id)
            .eq("feature_scope", "default_chat")
            .execute()
        )

        prefs = pref_res.data[0] if pref_res.data else None
        if not prefs or prefs.get("mode") != "manual":
            # Mode is "smart" (app default) or unconfigured
            _BYOK_CACHE[user_id] = (now, None)
            return None

        chosen_model = (prefs.get("model_id") or "").strip()
        provider_id = _infer_provider_from_model(chosen_model)

        # 2. Fetch available keys for this user
        keys_res = (
            supabase.table("user_api_keys")
            .select("*")
            .eq("user_id", user_id)
            .neq("status", "invalid")
            .execute()
        )
        keys = keys_res.data or []
        if not keys:
            _BYOK_CACHE[user_id] = (now, None)
            return None

        # Match key for inferred provider
        target_key_record = None
        if provider_id:
            target_key_record = next(
                (k for k in keys if k.get("provider_id") == provider_id),
                None,
            )

        # Fallback to OpenRouter key if present
        if not target_key_record:
            target_key_record = next(
                (k for k in keys if k.get("provider_id") == "openrouter"),
                None,
            )
            if target_key_record:
                provider_id = "openrouter"

        # Fallback to any single valid key if user only has 1
        if not target_key_record and len(keys) == 1:
            target_key_record = keys[0]
            provider_id = target_key_record.get("provider_id", "")

        if not target_key_record:
            _BYOK_CACHE[user_id] = (now, None)
            return None

        # 3. Decrypt key
        plaintext_key = decrypt_key(target_key_record)
        resolved = {
            "provider": provider_id or target_key_record.get("provider_id", "custom"),
            "model": chosen_model,
            "api_key": plaintext_key,
        }
        _BYOK_CACHE[user_id] = (now, resolved)
        return resolved

    except Exception as e:
        logger.warning("[BYOK] Failed to resolve user key: {}", e)
        _BYOK_CACHE[user_id] = (now, None)
        return None


async def call_byok_provider(
    http_client: httpx.AsyncClient,
    provider: str,
    model: str,
    api_key: str,
    prompt: str,
    system_instruction: str = "",
    temperature: float = 0.3,
    max_tokens: int = 600,
    response_format_json: bool = False,
) -> str | None:
    # calls third-party llm provider directly with user key
    from .llm_fallback import _call_openai_compat, _build_messages

    p = provider.lower()
    messages = _build_messages(system_instruction, prompt)

    try:
        # OpenAI
        if p == "openai":
            m = model or "gpt-4o"
            return await _call_openai_compat(
                http_client=http_client,
                url="https://api.openai.com/v1/chat/completions",
                key=api_key,
                model=m,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format_json=response_format_json,
                provider="openai-byok",
                timeout=12.0,
            )

        # Groq
        if p == "groq":
            m = model or "llama-3.1-70b-versatile"
            return await _call_openai_compat(
                http_client=http_client,
                url="https://api.groq.com/openai/v1/chat/completions",
                key=api_key,
                model=m,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format_json=response_format_json,
                provider="groq-byok",
                timeout=10.0,
            )

        # OpenRouter
        if p == "openrouter":
            m = model or "openai/gpt-4o-mini"
            if m.startswith("openrouter/"):
                m = m.replace("openrouter/", "")
            if m in ["auto", ""]:
                m = "openai/gpt-4o-mini"
            return await _call_openai_compat(
                http_client=http_client,
                url="https://openrouter.ai/api/v1/chat/completions",
                key=api_key,
                model=m,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format_json=response_format_json,
                extra_headers={
                    "HTTP-Referer": "https://meetmaxxing.vercel.app",
                    "X-Title": "MeetMaxxing",
                },
                provider="openrouter-byok",
                timeout=10.0,
            )

        # DeepSeek
        if p == "deepseek":
            m = model or "deepseek-chat"
            return await _call_openai_compat(
                http_client=http_client,
                url="https://api.deepseek.com/chat/completions",
                key=api_key,
                model=m,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format_json=response_format_json,
                provider="deepseek-byok",
                timeout=12.0,
            )

        # Mistral
        if p == "mistral":
            m = model or "mistral-large-latest"
            return await _call_openai_compat(
                http_client=http_client,
                url="https://api.mistral.ai/v1/chat/completions",
                key=api_key,
                model=m,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format_json=response_format_json,
                provider="mistral-byok",
                timeout=10.0,
            )

        # Perplexity
        if p == "perplexity":
            m = model or "sonar"
            return await _call_openai_compat(
                http_client=http_client,
                url="https://api.perplexity.ai/chat/completions",
                key=api_key,
                model=m,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format_json=False,
                provider="perplexity-byok",
                timeout=10.0,
            )

        # Anthropic Claude
        if p == "anthropic":
            m = model or "claude-3-5-sonnet-latest"
            payload: dict[str, Any] = {
                "model": m,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{"role": "user", "content": prompt}],
            }
            if system_instruction:
                payload["system"] = system_instruction

            headers = {
                "x-api-key": api_key.strip(),
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            }
            res = await http_client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload,
                timeout=12.0,
            )
            if res.status_code == 200:
                data = res.json()
                content = data.get("content", [])
                if content and isinstance(content, list):
                    return content[0].get("text", "").strip()
            logger.warning("[BYOK Anthropic] status {}: {}", res.status_code, res.text[:120])
            return None

        # Google Gemini
        if p == "google":
            m = model or "gemini-2.5-flash"
            try:
                from google import genai
                from google.genai import types as genai_types
                client = genai.Client(api_key=api_key.strip())
                cfg: dict[str, Any] = {
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                }
                if system_instruction:
                    cfg["system_instruction"] = system_instruction
                if response_format_json:
                    cfg["response_mime_type"] = "application/json"
                loop = httpx.asyncio.get_running_loop()
                resp = await loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=genai_types.GenerateContentConfig(**cfg),
                    ),
                )
                if resp and resp.text:
                    return resp.text.strip()
            except Exception as ge:
                logger.warning("[BYOK Gemini SDK] failed: {}, trying rest", ge)
                # Fallback to direct REST endpoint
                rest_url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key.strip()}"
                r_body = {"contents": [{"parts": [{"text": prompt}]}]}
                r_res = await http_client.post(rest_url, json=r_body, timeout=10.0)
                if r_res.status_code == 200:
                    candidates = r_res.json().get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
            return None

    except Exception as e:
        logger.warning("[BYOK] Failed to call provider {}: {}", provider, e)

    return None
