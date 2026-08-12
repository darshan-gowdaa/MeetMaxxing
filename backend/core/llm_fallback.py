import asyncio
import json
from typing import Any

import httpx
from loguru import logger

from .config import settings
from .rate_limiter import rate_limiter

# Shared connection-pooled client — closed at process exit
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=20.0)
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
) -> str | None:
    """
    Shared helper for Groq/OpenRouter/Perplexity — all are OpenAI-compatible.
    Returns response text on success, None on failure.
    """
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

    res = await http_client.post(url, headers=headers, json=payload)
    if res.status_code == 200:
        text = res.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        return text.strip() if text else None
    if res.status_code == 429:
        rate_limiter.record_failure(provider)
        logger.warning("[LLM Fallback] {} rate limited (429)", provider)
    else:
        rate_limiter.record_failure(provider)
        logger.warning("[LLM Fallback] {} error {}: {}", provider, res.status_code, res.text[:150])
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
) -> tuple[str, str]:
    """
    Generate text with fallback order: Gemini → Groq → OpenRouter → Perplexity.
    Returns (response_text, powered_by_string).
    """
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

    # 1. Google Gemini
    gemini_key = settings.GEMINI_API_KEY
    if not _is_placeholder(gemini_key) and await rate_limiter.acquire("gemini"):
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
            response = await loop.run_in_executor(
                None,
                lambda: client.models.generate_content(
                    model=settings.GEMINI_FLASH_MODEL,
                    contents=prompt,
                    config=genai_types.GenerateContentConfig(**config_kwargs),
                )
            )
            if response and response.text:
                rate_limiter.record_success("gemini")
                return await _cache_and_return(
                    response.text.strip(),
                    f"Google Gemini API ({settings.GEMINI_FLASH_MODEL})"
                )
        except Exception as e:
            errors.append(f"Gemini: {e}")
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                rate_limiter.record_failure("gemini")
            logger.debug("[LLM Fallback] Gemini failed: {}", e)
    else:
        errors.append("Gemini: skipped (no key or degraded)")

    # 2. Groq
    groq_key = settings.GROQ_API_KEY
    if not _is_placeholder(groq_key) and await rate_limiter.acquire("groq"):
        try:
            text = await _call_openai_compat(
                http_client, "https://api.groq.com/openai/v1/chat/completions",
                groq_key, "llama-3.3-70b-versatile",
                _build_messages(system_instruction, prompt),
                temperature, max_tokens, response_format_json, provider="groq",
            )
            if text:
                rate_limiter.record_success("groq")
                return await _cache_and_return(text, "Groq API (Llama 3.3 70B)")
        except Exception as e:
            rate_limiter.record_failure("groq")
            errors.append(f"Groq: {e}")
    else:
        errors.append("Groq: skipped (no key or degraded)")

    # 3. OpenRouter
    openrouter_key = settings.OPENROUTER_API_KEY
    if not _is_placeholder(openrouter_key) and await rate_limiter.acquire("openrouter"):
        try:
            text = await _call_openai_compat(
                http_client, "https://openrouter.ai/api/v1/chat/completions",
                openrouter_key, "google/gemini-2.0-flash-001",
                _build_messages(system_instruction, prompt),
                temperature, max_tokens, response_format_json,
                extra_headers={
                    "HTTP-Referer": "https://meetmaxxing.vercel.app",
                    "X-Title": "MeetMaxxing",
                },
                provider="openrouter",
            )
            if text:
                rate_limiter.record_success("openrouter")
                return await _cache_and_return(text, "OpenRouter API (Gemini Flash)")
        except Exception as e:
            rate_limiter.record_failure("openrouter")
            errors.append(f"OpenRouter: {e}")
    else:
        errors.append("OpenRouter: skipped (no key or degraded)")

    # 4. Perplexity
    perplexity_key = settings.PERPLEXITY_API_KEY
    if not _is_placeholder(perplexity_key) and await rate_limiter.acquire("perplexity"):
        try:
            text = await _call_openai_compat(
                http_client, "https://api.perplexity.ai/chat/completions",
                perplexity_key, "sonar-pro",
                _build_messages(system_instruction, prompt),
                temperature, max_tokens, response_format_json=False,
                provider="perplexity",
            )
            if text:
                rate_limiter.record_success("perplexity")
                return await _cache_and_return(text, "Perplexity API (Sonar Pro)")
        except Exception as e:
            rate_limiter.record_failure("perplexity")
            errors.append(f"Perplexity: {e}")
    else:
        errors.append("Perplexity: skipped (no key or degraded)")

    logger.error("[LLM Fallback] All providers failed: {}", " | ".join(errors))

    if response_format_json:
        is_rate_limit = any("429" in e or "RESOURCE_EXHAUSTED" in e for e in errors)
        err_msg = "Gemini's Free Limit Exceeded or experiencing high demand. Please try again with another API key." if is_rate_limit else "All AI providers failed or keys are missing. Please check your API keys."
        
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
    err_msg = "Gemini's Free Limit Exceeded or experiencing high demand. Please try again with another API key." if is_rate_limit else "Mock response — API failure or missing keys. Check API settings."
    return err_msg, "API Error"
