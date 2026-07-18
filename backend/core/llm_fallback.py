import httpx
import json
import asyncio
from typing import Optional, Any
from .config import settings
from .rate_limiter import rate_limiter

# Global client for connection pooling
_http_client: Optional[httpx.AsyncClient] = None

def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=20.0)
    return _http_client

async def generate_content_with_fallback(
    prompt: str,
    system_instruction: str = "",
    temperature: float = 0.3,
    max_tokens: int = 600,
    response_format_json: bool = False,
    cache_ttl: int = 300,
) -> tuple[str, str]:
    """
    Generate text adhering strictly to fallback order requested by user:
    1: Google Gemini API (`gemini-2.5-flash`)
    2: Groq API (`llama-3.3-70b-versatile`)
    3: OpenRouter API (`google/gemini-2.0-flash-001` / `meta-llama/llama-3.3-70b-instruct`)
    4: Perplexity API (`sonar-pro`)
    
    Returns: tuple[response_text, powered_by_provider_string]
    """
    
    # Check cache first
    cached = await rate_limiter.get_cached_response(prompt, "fallback", temperature)
    if cached:
        print("[MeetMaxxing LLM Fallback] Returning cached response.")
        return cached["text"], cached["provider"]

    http_client = get_http_client()
    errors = []

    # 1. Try Google Gemini API (Priority 1)
    gemini_key = getattr(settings, "GEMINI_API_KEY", "")
    if gemini_key and gemini_key.strip() and gemini_key.strip() not in ["your-gemini-api-key", "mock-key", ""]:
        if await rate_limiter.acquire("gemini"):
            try:
                print(f"[MeetMaxxing LLM Fallback] [Priority 1] Calling Google Gemini Flash ({settings.GEMINI_FLASH_MODEL})...")
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

                loop = asyncio.get_event_loop()
                def _run_gemini():
                    return client.models.generate_content(
                        model=settings.GEMINI_FLASH_MODEL,
                        contents=prompt,
                        config=genai_types.GenerateContentConfig(**config_kwargs),
                    )
                response = await loop.run_in_executor(None, _run_gemini)
                if response and response.text:
                    print("[MeetMaxxing LLM Fallback] Gemini Flash succeeded!")
                    rate_limiter.record_success("gemini")
                    result_text = response.text.strip()
                    provider_str = f"Google Gemini API ({settings.GEMINI_FLASH_MODEL})"
                    await rate_limiter.set_cached_response(prompt, "fallback", temperature, {"text": result_text, "provider": provider_str}, cache_ttl)
                    return result_text, provider_str
            except Exception as gemini_err:
                errors.append(f"Gemini: {gemini_err}")
                if "429" in str(gemini_err) or "RESOURCE_EXHAUSTED" in str(gemini_err):
                    rate_limiter.record_failure("gemini")
                print(f"[MeetMaxxing LLM Fallback] Gemini failed: {gemini_err}. Moving to Groq...")
        else:
            errors.append("Gemini: Rate limited/degraded")
            print("[MeetMaxxing LLM Fallback] Gemini rate limit/degraded, skipping...")

    # 2. Try Groq API (Priority 2)
    groq_key = getattr(settings, "GROQ_API_KEY", "")
    if groq_key and groq_key.strip() and groq_key.strip() != "your-groq-key":
        if await rate_limiter.acquire("groq"):
            try:
                print("[MeetMaxxing LLM Fallback] [Priority 2] Using Groq API (llama-3.3-70b-versatile)...")
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                payload = {
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                if response_format_json:
                    payload["response_format"] = {"type": "json_object"}

                res = await http_client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key.strip()}", "Content-Type": "application/json"},
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        print("[MeetMaxxing LLM Fallback] Groq succeeded!")
                        rate_limiter.record_success("groq")
                        result_text = text.strip()
                        provider_str = "Groq API (Llama 3.3 70B)"
                        await rate_limiter.set_cached_response(prompt, "fallback", temperature, {"text": result_text, "provider": provider_str}, cache_ttl)
                        return result_text, provider_str
                elif res.status_code == 429:
                    rate_limiter.record_failure("groq")
                    errors.append(f"Groq: Rate Limit ({res.status_code})")
                    print(f"[MeetMaxxing LLM Fallback] Groq Rate Limit ({res.status_code})")
                else:
                    rate_limiter.record_failure("groq")
                    errors.append(f"Groq: Error {res.status_code}")
                    print(f"[MeetMaxxing LLM Fallback] Groq error ({res.status_code}): {res.text[:150]}")
            except Exception as groq_err:
                rate_limiter.record_failure("groq")
                errors.append(f"Groq: Exception {groq_err}")
                print(f"[MeetMaxxing LLM Fallback] Groq exception: {groq_err}")
        else:
            errors.append("Groq: Rate limited/degraded")
            print("[MeetMaxxing LLM Fallback] Groq rate limit/degraded, skipping...")

    # 3. Try OpenRouter (Priority 3)
    openrouter_key = getattr(settings, "OPEN_ROUTER_API_KEY", "") or getattr(settings, "OPENROUTER_API_KEY", "")
    if openrouter_key and openrouter_key.strip() and openrouter_key.strip() != "your-openrouter-key":
        if await rate_limiter.acquire("openrouter"):
            try:
                print("[MeetMaxxing LLM Fallback] [Priority 3] Using OpenRouter API (google/gemini-2.0-flash-001)...")
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                payload: dict[str, Any] = {
                    "model": "google/gemini-2.0-flash-001",
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                if response_format_json:
                    payload["response_format"] = {"type": "json_object"}

                res = await http_client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openrouter_key.strip()}",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "MeetMaxxing",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        print("[MeetMaxxing LLM Fallback] OpenRouter succeeded!")
                        rate_limiter.record_success("openrouter")
                        result_text = text.strip()
                        provider_str = "OpenRouter API (Gemini Flash)"
                        await rate_limiter.set_cached_response(prompt, "fallback", temperature, {"text": result_text, "provider": provider_str}, cache_ttl)
                        return result_text, provider_str
                elif res.status_code == 429:
                    rate_limiter.record_failure("openrouter")
                    errors.append(f"OpenRouter: Rate Limit ({res.status_code})")
                    print(f"[MeetMaxxing LLM Fallback] OpenRouter Rate Limit ({res.status_code})")
                else:
                    rate_limiter.record_failure("openrouter")
                    errors.append(f"OpenRouter: Error {res.status_code}")
                    print(f"[MeetMaxxing LLM Fallback] OpenRouter error ({res.status_code}): {res.text[:150]}")
            except Exception as openrouter_err:
                rate_limiter.record_failure("openrouter")
                errors.append(f"OpenRouter: Exception {openrouter_err}")
                print(f"[MeetMaxxing LLM Fallback] OpenRouter exception: {openrouter_err}")
        else:
            errors.append("OpenRouter: Rate limited/degraded")
            print("[MeetMaxxing LLM Fallback] OpenRouter rate limit/degraded, skipping...")

    # 4. Try Perplexity API (Priority 4)
    perplexity_key = getattr(settings, "PERPLEXITY_API_KEY", "")
    if perplexity_key and perplexity_key.strip() and perplexity_key.strip() != "your-perplexity-key":
        if await rate_limiter.acquire("perplexity"):
            try:
                print("[MeetMaxxing LLM Fallback] [Priority 4] Using Perplexity API (sonar-pro)...")
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                payload = {
                    "model": "sonar-pro",
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }

                res = await http_client.post(
                    "https://api.perplexity.ai/chat/completions",
                    headers={"Authorization": f"Bearer {perplexity_key.strip()}", "Content-Type": "application/json"},
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        print("[MeetMaxxing LLM Fallback] Perplexity succeeded!")
                        rate_limiter.record_success("perplexity")
                        result_text = text.strip()
                        provider_str = "Perplexity API (Sonar Pro)"
                        await rate_limiter.set_cached_response(prompt, "fallback", temperature, {"text": result_text, "provider": provider_str}, cache_ttl)
                        return result_text, provider_str
                elif res.status_code == 429:
                    rate_limiter.record_failure("perplexity")
                    errors.append(f"Perplexity: Rate Limit ({res.status_code})")
                    print(f"[MeetMaxxing LLM Fallback] Perplexity Rate Limit ({res.status_code})")
                else:
                    rate_limiter.record_failure("perplexity")
                    errors.append(f"Perplexity: Error {res.status_code}")
                    print(f"[MeetMaxxing LLM Fallback] Perplexity error ({res.status_code}): {res.text[:150]}")
            except Exception as perp_err:
                rate_limiter.record_failure("perplexity")
                errors.append(f"Perplexity: Exception {perp_err}")
                print(f"[MeetMaxxing LLM Fallback] Perplexity exception: {perp_err}")
        else:
            errors.append("Perplexity: Rate limited/degraded")
            print("[MeetMaxxing LLM Fallback] Perplexity rate limit/degraded, skipping...")

    error_summary = " | ".join(errors)
    raise RuntimeError(f"All configured LLM providers (1: Gemini, 2: Groq, 3: OpenRouter, 4: Perplexity) failed. Details: {error_summary}")
