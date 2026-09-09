import asyncio
import json
from typing import Any

import httpx
from loguru import logger

from .config import settings
from .rate_limiter import rate_limiter

# Shared connection-pooled client — closed at process exit
_http_client: httpx.AsyncClient | None = None
_http_client_loop: asyncio.AbstractEventLoop | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client, _http_client_loop
    loop = asyncio.get_running_loop()
    if _http_client is None or _http_client.is_closed or _http_client_loop is not loop:
        # httpx.AsyncClient is loop-bound; recreate if the running loop changed.
        _http_client = httpx.AsyncClient(timeout=20.0)
        _http_client_loop = loop
    return _http_client


def _is_placeholder(key: str) -> bool:
    return not key or key.strip() in ["", "your-gemini-api-key", "mock-key", "your-groq-key", "your-openrouter-key", "your-perplexity-key"]


async def _call_openai_compat(
    http_client: httpx.AsyncClient,
    url: str,
    key: str,
    model: str,
    messages: list[dict],
    temperature: float,
    max_tokens: int,
    response_format_json: bool,
    extra_headers: dict | None = None,
    provider: str = "",
    timeout: float = 8.0,
) -> str | None:
    # helper for apis that follow the openai chat completion format
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format_json:
        payload["response_format"] = {"type": "json_object"}

    headers = {"Authorization": f"Bearer {key.strip()}", "Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)

    try:
        res = await http_client.post(url, headers=headers, json=payload, timeout=timeout)
        if res.status_code == 200:
            text = res.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            return text.strip() if text else None
        if res.status_code == 429:
            rate_limiter.record_failure(provider)
            logger.warning("[LLM Fallback] {} rate limited (429)", provider)
        else:
            logger.warning("[LLM Fallback] {} error {}: {}", provider, res.status_code, res.text[:150])
    except Exception as e:
        logger.warning("[LLM Fallback] {} network error: {}", provider, e)
    return None


def _build_messages(system_instruction: str, prompt: str) -> list[dict]:
    msgs = []
    if system_instruction:
        msgs.append({"role": "system", "content": system_instruction})
    msgs.append({"role": "user", "content": prompt})
    return msgs


async def generate_content_with_fallback(
    prompt: str,
    system_instruction: str = "",
    temperature: float = 0.3,
    max_tokens: int = 600,
    response_format_json: bool = False,
    cache_ttl: int = 300,
    bypass_cache: bool = False,
    user_id: str | None = None,
) -> tuple[str, str]:
    # handles routing queries to available llm providers in priority order
    if not bypass_cache:
        cached = await rate_limiter.get_cached_response(prompt, "fallback", temperature)
        if cached:
            return cached["text"], cached["provider"]

    http_client = get_http_client()
    errors = []

    async def _cache_and_return(text: str, provider_str: str) -> tuple[str, str]:
        await rate_limiter.set_cached_response(
            prompt, "fallback", temperature, {"text": text, "provider": provider_str}, cache_ttl
        )
        return text, provider_str

    # 0. User BYOK (Bring Your Own Key) check
    if user_id:
        try:
            from .byok import resolve_user_byok, call_byok_provider
            byok_cfg = await resolve_user_byok(user_id)
            if byok_cfg:
                b_provider = byok_cfg["provider"]
                b_model = byok_cfg["model"]
                b_key = byok_cfg["api_key"]
                logger.info("[LLM BYOK] Routing request to user key for provider={}, model={}", b_provider, b_model)
                byok_text = await call_byok_provider(
                    http_client=http_client,
                    provider=b_provider,
                    model=b_model,
                    api_key=b_key,
                    prompt=prompt,
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format_json=response_format_json,
                )
                if byok_text:
                    label = f"BYOK: {b_provider.capitalize()} ({b_model or 'default'})"
                    return await _cache_and_return(byok_text, label)
                logger.warning("[LLM BYOK] User key for {} failed; falling back to MeetMaxxing AI default pool.", b_provider)
        except Exception as byok_err:
            logger.warning("[LLM BYOK] Error in BYOK resolution/execution: {}", byok_err)

    # 1. Google Gemini (fast fail on quota exhaustion)
    gemini_key = settings.GEMINI_API_KEY
    if not _is_placeholder(gemini_key) and await rate_limiter.acquire("gemini", wait=False):
        try:
            from google import genai
            from google.genai import types as genai_types

            client = genai.Client(api_key=gemini_key)
            config_kwargs: dict[str, Any] = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction
            if response_format_json:
                config_kwargs["response_mime_type"] = "application/json"

            loop = asyncio.get_running_loop()
            gemini_models = [settings.GEMINI_FLASH_MODEL]
            if "2.5" in settings.GEMINI_FLASH_MODEL:
                gemini_models.append("gemini-2.0-flash")

            for g_model in gemini_models:
                try:
                    response = await asyncio.wait_for(
                        loop.run_in_executor(
                            None,
                            lambda m=g_model: client.models.generate_content(
                                model=m,
                                contents=prompt,
                                config=genai_types.GenerateContentConfig(**config_kwargs),
                            ),
                        ),
                        timeout=5.0,
                    )
                    if response and response.text:
                        rate_limiter.record_success("gemini")
                        return await _cache_and_return(
                            response.text.strip(),
                            f"MeetMaxxing AI (Gemini - {g_model})",
                        )
                except Exception as inner_e:
                    if "429" in str(inner_e) or "RESOURCE_EXHAUSTED" in str(inner_e):
                        rate_limiter.record_failure("gemini", is_quota=True)
                        break
                    continue
        except Exception as e:
            errors.append(f"Gemini: {e}")
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                rate_limiter.record_failure("gemini", is_quota=True)
            logger.debug("[LLM Fallback] Gemini failed: {}", e)
    else:
        errors.append("Gemini: skipped (no key or degraded)")

    # 2. OpenRouter (rock solid, fast response times)
    openrouter_key = settings.OPENROUTER_API_KEY
    if not _is_placeholder(openrouter_key) and await rate_limiter.acquire("openrouter", wait=False):

        openrouter_models = [
            "google/gemini-2.5-flash",
            "meta-llama/llama-3.3-70b-instruct",
            "deepseek/deepseek-chat",
        ]
        for m in openrouter_models:
            try:
                text = await _call_openai_compat(
                    http_client,
                    "https://openrouter.ai/api/v1/chat/completions",
                    openrouter_key,
                    m,
                    _build_messages(system_instruction, prompt),
                    temperature,
                    max_tokens,
                    response_format_json,
                    extra_headers={
                        "HTTP-Referer": "https://meetmaxxing.vercel.app",
                        "X-Title": "MeetMaxxing",
                    },
                    provider="openrouter",
                    timeout=7.0,
                )
                if text:
                    rate_limiter.record_success("openrouter")
                    return await _cache_and_return(text, f"MeetMaxxing AI (OpenRouter - {m})")
            except Exception as e:
                errors.append(f"OpenRouter ({m}): {e}")
        rate_limiter.record_failure("openrouter")
    else:
        errors.append("OpenRouter: skipped (no key or degraded)")

    # 3. Groq (high speed inference)
    groq_key = settings.GROQ_API_KEY
    if not _is_placeholder(groq_key) and await rate_limiter.acquire("groq"):
        groq_models = [
            "openai/gpt-oss-20b",
            "groq/compound-mini",
            "allam-2-7b",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
        ]
        for m in groq_models:
            try:
                text = await _call_openai_compat(
                    http_client,
                    "https://api.groq.com/openai/v1/chat/completions",
                    groq_key,
                    m,
                    _build_messages(system_instruction, prompt),
                    temperature,
                    max_tokens,
                    response_format_json,
                    provider="groq",
                    timeout=6.0,
                )
                if text:
                    rate_limiter.record_success("groq")
                    return await _cache_and_return(text, f"MeetMaxxing AI (Groq - {m})")
            except Exception as e:
                errors.append(f"Groq ({m}): {e}")
        rate_limiter.record_failure("groq")
    else:
        errors.append("Groq: skipped (no key or degraded)")

    # 4. Perplexity (live search and reasoning model)
    perplexity_key = settings.PERPLEXITY_API_KEY
    if not _is_placeholder(perplexity_key) and await rate_limiter.acquire("perplexity"):
        try:
            pplx_tokens = max(max_tokens, 30)
            text = await _call_openai_compat(
                http_client,
                "https://api.perplexity.ai/chat/completions",
                perplexity_key,
                "sonar",
                _build_messages(system_instruction, prompt),
                temperature,
                pplx_tokens,
                response_format_json=False,
                provider="perplexity",
                timeout=7.0,
            )
            if text:
                rate_limiter.record_success("perplexity")
                return await _cache_and_return(text, "MeetMaxxing AI (Perplexity Sonar)")
        except Exception as e:
            rate_limiter.record_failure("perplexity")
            errors.append(f"Perplexity: {e}")
    else:
        errors.append("Perplexity: skipped (no key or degraded)")

    logger.error("[LLM Fallback] All providers failed: {}", " | ".join(errors))

    if response_format_json:
        is_rate_limit = any("429" in e or "RESOURCE_EXHAUSTED" in e for e in errors)
        err_msg = "Rate limit reached on AI providers. Retrying shortly." if is_rate_limit else "AI services unavailable. Please check configuration."
        mock = {
            "error": err_msg,
            "error_type": "QUOTA_EXCEEDED" if is_rate_limit else "API_ERROR",
            "recap": err_msg,
            "key_decisions_so_far": [],
            "current_topic": "Unknown",
            "who_said_what": [],
            "suggestions": [err_msg],
            "next_questions": [err_msg],
            "summary": err_msg,
            "decisions": [],
            "action_items": [],
            "follow_up": {"required": False, "reason": "Mock"},
        }
        return json.dumps(mock), "API Error"

    is_rate_limit = any("429" in e or "RESOURCE_EXHAUSTED" in e for e in errors)
    err_msg = "Rate limit reached on AI providers. Retrying shortly." if is_rate_limit else "AI services unavailable. Please check configuration."
    return err_msg, "API Error"

