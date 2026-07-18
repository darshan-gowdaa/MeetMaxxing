import asyncio
import hashlib
import json
import time
import random
import logging
from dataclasses import dataclass, field
from typing import Dict, Optional, Any

from .config import settings

logger = logging.getLogger(__name__)


@dataclass
class ProviderHealth:
    failures: int = 0
    last_failure_time: float = 0
    is_degraded: bool = False
    
    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= 3:
            self.is_degraded = True
            logger.warning(f"Provider marked as degraded after {self.failures} consecutive failures")

    def record_success(self):
        self.failures = 0
        self.is_degraded = False

    def can_attempt(self) -> bool:
        if not self.is_degraded:
            return True
        # Cooldown of 60 seconds if degraded
        if time.time() - self.last_failure_time > 60:
            return True
        return False


class TokenBucket:
    def __init__(self, capacity: int, fill_rate: float):
        """
        capacity: Maximum tokens (burst size)
        fill_rate: Tokens added per second (RPM / 60)
        """
        self.capacity = capacity
        self.fill_rate = fill_rate
        self.tokens = capacity
        self.last_update = time.time()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: int = 1) -> bool:
        async with self._lock:
            now = time.time()
            # Refill
            elapsed = now - self.last_update
            self.tokens = min(self.capacity, self.tokens + elapsed * self.fill_rate)
            self.last_update = now

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False


class CacheEntry:
    def __init__(self, response: Any, ttl: int):
        self.response = response
        self.expires_at = time.time() + ttl


class IntelligentRateLimiter:
    def __init__(self):
        self.rpm = settings.RATE_LIMIT_RPM
        self.burst = settings.RATE_LIMIT_BURST
        self.fill_rate = self.rpm / 60.0
        
        # Track per-provider limits (e.g., "gemini", "openrouter", "groq", "perplexity")
        self.buckets: Dict[str, TokenBucket] = {}
        self.health: Dict[str, ProviderHealth] = {}
        
        # Semantic Response Cache
        self.cache: Dict[str, CacheEntry] = {}
        
        self._cache_lock = asyncio.Lock()
        
    def _get_bucket(self, provider: str) -> TokenBucket:
        if provider not in self.buckets:
            self.buckets[provider] = TokenBucket(self.burst, self.fill_rate)
        return self.buckets[provider]

    def _get_health(self, provider: str) -> ProviderHealth:
        if provider not in self.health:
            self.health[provider] = ProviderHealth()
        return self.health[provider]

    async def acquire(self, provider: str, tokens: int = 1, wait: bool = True) -> bool:
        """
        Attempt to acquire tokens for a provider. If wait is True, uses exponential backoff.
        """
        health = self._get_health(provider)
        if not health.can_attempt():
            return False

        bucket = self._get_bucket(provider)
        
        if not wait:
            return await bucket.acquire(tokens)

        # Exponential backoff with jitter
        max_attempts = 3
        base_delay = 1.0
        
        for attempt in range(max_attempts):
            if await bucket.acquire(tokens):
                return True
            
            # Wait with exponential backoff + jitter
            delay = min((2 ** attempt) * base_delay + random.uniform(0, 1), 60)
            logger.info(f"Rate limit hit for {provider}, sleeping for {delay:.2f}s")
            await asyncio.sleep(delay)
            
        return False

    def record_failure(self, provider: str):
        self._get_health(provider).record_failure()

    def record_success(self, provider: str):
        self._get_health(provider).record_success()

    def is_degraded(self, provider: str) -> bool:
        return not self._get_health(provider).can_attempt()

    def _generate_cache_key(self, prompt: str, model: str, temperature: float) -> str:
        data = f"{prompt}:{model}:{temperature}".encode('utf-8')
        return hashlib.sha256(data).hexdigest()

    async def get_cached_response(self, prompt: str, model: str, temperature: float) -> Optional[Any]:
        key = self._generate_cache_key(prompt, model, temperature)
        async with self._cache_lock:
            if key in self.cache:
                entry = self.cache[key]
                if time.time() < entry.expires_at:
                    return entry.response
                else:
                    del self.cache[key]
        return None

    async def set_cached_response(self, prompt: str, model: str, temperature: float, response: Any, ttl: int = 300):
        key = self._generate_cache_key(prompt, model, temperature)
        async with self._cache_lock:
            self.cache[key] = CacheEntry(response, ttl)

# Global instance
rate_limiter = IntelligentRateLimiter()
