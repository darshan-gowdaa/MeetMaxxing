"""
Unit and integration tests for BYOK API Keys preflight testing, error normalization,
dynamic model fetching, and key resolution.
"""

from unittest.mock import MagicMock
import httpx
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.auth import get_current_user
from backend.core.byok import (
    encrypt_key,
    resolve_user_byok,
    invalidate_user_byok_cache,
)
from backend.api.routes_api_keys import (
    REGISTRY,
    _MODELS_CACHE,
    _normalize_http_response,
    _normalize_exception,
    is_chat_model,
    format_model_name,
)

client = TestClient(app)
TEST_USER = {"user_id": "test-user-byok-preflight", "org_id": "test-org"}


@pytest.fixture(autouse=True)
def clean_caches():
    _MODELS_CACHE.clear()
    invalidate_user_byok_cache(TEST_USER["user_id"])
    yield
    _MODELS_CACHE.clear()
    invalidate_user_byok_cache(TEST_USER["user_id"])


# ---------------------------------------------------------------------------
# 1. Error Normalization Unit Tests
# ---------------------------------------------------------------------------


def test_normalize_http_responses():
    # 200 OK
    status, code, _msg = _normalize_http_response(200, "{}")
    assert status == "valid"
    assert code == ""

    # 401 Invalid Key
    status, code, _msg = _normalize_http_response(
        401, '{"error": {"message": "Incorrect API key"}}'
    )
    assert status == "invalid"
    assert code == "invalid_key"

    # 429 Quota Exhausted
    status, code, _msg = _normalize_http_response(
        429, '{"error": {"code": "insufficient_quota", "message": "Quota exceeded"}}'
    )
    assert status == "rate_limited"
    assert code == "insufficient_quota"

    # 429 Rate Limit Exceeded
    status, code, _msg = _normalize_http_response(
        429,
        '{"error": {"code": "rate_limit_exceeded", "message": "Too many requests"}}',
    )
    assert status == "rate_limited"
    assert code == "rate_limit_exceeded"

    # 503 / 504 Provider Unavailable
    status, code, _msg = _normalize_http_response(503, "Service Unavailable")
    assert status == "unavailable"
    assert code == "provider_unavailable"

    status, code, _msg = _normalize_http_response(504, "Gateway Timeout")
    assert status == "unavailable"
    assert code == "provider_unavailable"


def test_normalize_exceptions():
    timeout_err = httpx.ReadTimeout("Read timed out")
    status, code, _msg = _normalize_exception(timeout_err)
    assert status == "unavailable"
    assert code == "timeout"

    connect_err = httpx.ConnectError("Failed to connect")
    status, code, _msg = _normalize_exception(connect_err)
    assert status == "unavailable"
    assert code == "provider_unavailable"


# ---------------------------------------------------------------------------
# 2. Preflight Test Endpoint (POST /api-keys/test)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_preflight_valid_key(monkeypatch):
    """Verify preflight returns 200 with valid status and latency measurement."""

    async def mock_get(self, url, headers=None):
        return httpx.Response(
            status_code=200,
            json={"data": [{"id": "gpt-4o"}]},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    res = client.post(
        "/api-keys/test",
        json={"provider_id": "openai", "api_key": "sk-test-valid-key"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["status"] == "valid"
    assert isinstance(data["latency_ms"], int)
    assert data["latency_ms"] >= 0
    assert data["error_code"] is None
    assert data["error"] is None


@pytest.mark.asyncio
async def test_preflight_invalid_key_401(monkeypatch):
    """Verify 401 from provider normalizes to invalid_key."""

    async def mock_get(self, url, headers=None):
        return httpx.Response(
            status_code=401,
            json={"error": {"message": "Invalid API key"}},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    res = client.post(
        "/api-keys/test",
        json={"provider_id": "openai", "api_key": "sk-bad-key"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert data["status"] == "invalid"
    assert data["error_code"] == "invalid_key"


@pytest.mark.asyncio
async def test_preflight_quota_exhausted_429(monkeypatch):
    """Verify 429 quota exhaustion normalizes to insufficient_quota."""

    async def mock_get(self, url, headers=None):
        return httpx.Response(
            status_code=429,
            json={
                "error": {
                    "code": "insufficient_quota",
                    "message": "You exceeded your current quota.",
                }
            },
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    res = client.post(
        "/api-keys/test",
        json={"provider_id": "openai", "api_key": "sk-quota-key"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert data["status"] == "rate_limited"
    assert data["error_code"] == "insufficient_quota"


@pytest.mark.asyncio
async def test_preflight_rate_limit_429(monkeypatch):
    """Verify standard 429 normalizes to rate_limit_exceeded."""

    async def mock_get(self, url, headers=None):
        return httpx.Response(
            status_code=429,
            json={
                "error": {
                    "code": "rate_limit_exceeded",
                    "message": "Requests per min reached.",
                }
            },
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    res = client.post(
        "/api-keys/test",
        json={"provider_id": "openai", "api_key": "sk-rate-key"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert data["status"] == "rate_limited"
    assert data["error_code"] == "rate_limit_exceeded"


@pytest.mark.asyncio
async def test_preflight_provider_unavailable_503(monkeypatch):
    """Verify 503 normalizes to provider_unavailable."""

    async def mock_get(self, url, headers=None):
        return httpx.Response(
            status_code=503,
            text="Service Unavailable",
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    res = client.post(
        "/api-keys/test",
        json={"provider_id": "groq", "api_key": "gsk_test"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert data["status"] == "unavailable"
    assert data["error_code"] == "provider_unavailable"


@pytest.mark.asyncio
async def test_preflight_timeout(monkeypatch):
    """Verify client timeout normalizes to timeout."""

    async def mock_get(self, url, headers=None):
        raise httpx.ReadTimeout("Timed out reading from server")

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    res = client.post(
        "/api-keys/test",
        json={"provider_id": "openai", "api_key": "sk-timeout-key"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert data["status"] == "unavailable"
    assert data["error_code"] == "timeout"


def test_preflight_validation_inputs():
    # Missing provider_id or api_key -> 400
    r1 = client.post("/api-keys/test", json={"provider_id": "", "api_key": ""})
    assert r1.status_code == 400

    # Unknown provider
    r2 = client.post(
        "/api-keys/test",
        json={"provider_id": "nonexistent_provider", "api_key": "sk-123"},
    )
    assert r2.status_code == 200
    assert r2.json()["valid"] is False
    assert r2.json()["error_code"] == "unknown_provider"


# ---------------------------------------------------------------------------
# 3. Dynamic Models Endpoints & Filtering (POST /api-keys/models)
# ---------------------------------------------------------------------------


def test_model_filtering_helpers():
    assert is_chat_model("gpt-4o") is True
    assert is_chat_model("claude-3-5-sonnet") is True
    assert is_chat_model("text-embedding-3-small") is False
    assert is_chat_model("whisper-1") is False
    assert is_chat_model("dall-e-3") is False
    assert is_chat_model("text-moderation-latest") is False

    assert format_model_name("gpt-4o") == "GPT-4o"
    assert format_model_name("llama-3.3-70b-versatile") == "Llama 3.3 70B Versatile"


@pytest.mark.asyncio
async def test_post_fetch_models_filters_and_caches(monkeypatch):
    call_count = 0

    async def mock_get(self, url, headers=None):
        nonlocal call_count
        call_count += 1
        return httpx.Response(
            status_code=200,
            json={
                "data": [
                    {"id": "gpt-4o", "context_window": 128000},
                    {"id": "text-embedding-3-large"},
                    {"id": "whisper-1"},
                    {"id": "dall-e-3"},
                    {"id": "gpt-4o-mini", "context_window": 128000},
                ]
            },
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    # First call - fetches from provider
    res = client.post(
        "/api-keys/models",
        json={"provider_id": "openai", "api_key": "sk-mock-key"},
    )
    assert res.status_code == 200
    data = res.json()
    models = data["models"]
    model_ids = [m["id"] for m in models]
    assert "gpt-4o" in model_ids
    assert "gpt-4o-mini" in model_ids
    assert "text-embedding-3-large" not in model_ids
    assert "whisper-1" not in model_ids
    assert "dall-e-3" not in model_ids
    assert call_count == 1

    # Second call - in-memory 10-minute cache should return without calling mock_get again
    res2 = client.post(
        "/api-keys/models",
        json={"provider_id": "openai", "api_key": "sk-mock-key"},
    )
    assert res2.status_code == 200
    assert len(res2.json()["models"]) == len(models)
    assert call_count == 1  # No extra HTTP request


# ---------------------------------------------------------------------------
# 4. User Models Endpoint with Saved Keys (GET /api-keys/{provider_id}/models)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_user_models_saved_key(monkeypatch):
    app.dependency_overrides[get_current_user] = lambda: TEST_USER

    mock_key = encrypt_key("sk-saved-openai-key")
    mock_key.update(
        {
            "id": "key-default-1",
            "user_id": TEST_USER["user_id"],
            "provider_id": "openai",
            "is_default_for_provider": True,
            "status": "valid",
        }
    )

    class MockQuery:
        def __init__(self, data):
            self.data = data

        def select(self, *a, **kw):
            return self

        def eq(self, *a, **kw):
            return self

        def neq(self, *a, **kw):
            return self

        def execute(self):
            return self

    class MockSupabase:
        def table(self, name: str):
            if name == "user_api_keys":
                return MockQuery([mock_key])
            return MockQuery([])

    monkeypatch.setattr(
        "backend.api.routes_api_keys.get_supabase_admin", lambda: MockSupabase()
    )

    async def mock_get(self, url, headers=None):
        return httpx.Response(
            status_code=200,
            json={"data": [{"id": "gpt-4o"}]},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    res = client.get("/api-keys/openai/models")
    assert res.status_code == 200
    data = res.json()
    assert len(data["models"]) >= 1
    assert data["models"][0]["id"] == "gpt-4o"

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 5. POST /api-keys/ Auto-generate Label When Empty
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_key_auto_generates_label(monkeypatch):
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    captured_data = {}

    class MockTable:
        def upsert(self, data, on_conflict=None):
            captured_data.update(data)
            return self

        def update(self, data):
            captured_data.update(data)
            return self

        def eq(self, *a, **kw):
            return self

        def select(self, *a, **kw):
            return self

        def execute(self):
            return MagicMock(data=[{"id": "new-k1", **captured_data}])

    class MockSupabase:
        def table(self, name: str):
            return MockTable()

    monkeypatch.setattr(
        "backend.api.routes_api_keys.get_supabase_admin", lambda: MockSupabase()
    )

    # Empty label
    res = client.post(
        "/api-keys/",
        json={"provider_id": "openai", "key": "sk-openai-test-key", "label": ""},
    )
    assert res.status_code == 200
    label = captured_data.get("label", "")
    assert label.startswith("Openai Key")
    assert len(label) > 10

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 6. POST /api-keys/{key_id}/check-status Returns latency_ms
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_check_status_returns_latency_ms(monkeypatch):
    app.dependency_overrides[get_current_user] = lambda: TEST_USER

    mock_key = encrypt_key("sk-openai-ping-key")
    mock_key.update(
        {
            "id": "key-ping-1",
            "user_id": TEST_USER["user_id"],
            "provider_id": "openai",
            "status": "unchecked",
        }
    )

    class MockTable:
        def select(self, *a, **kw):
            return self

        def eq(self, *a, **kw):
            return self

        def update(self, *a, **kw):
            return self

        def execute(self):
            return MagicMock(data=[mock_key])

    class MockSupabase:
        def table(self, name: str):
            return MockTable()

    monkeypatch.setattr(
        "backend.api.routes_api_keys.get_supabase_admin", lambda: MockSupabase()
    )

    async def mock_get(self, url, headers=None):
        return httpx.Response(
            status_code=200,
            json={"data": [{"id": "gpt-4o"}]},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    res = client.post("/api-keys/key-ping-1/check-status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "valid"
    assert "latency_ms" in data
    assert isinstance(data["latency_ms"], int)
    assert data["latency_ms"] >= 0

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 7. resolve_user_byok Selection Respects Defaults & Preferences
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resolve_user_byok_respects_is_default(monkeypatch):
    """When multiple keys exist for a provider, select key marked is_default_for_provider."""
    k1 = encrypt_key("sk-key-regular")
    k1.update(
        {
            "id": "key-reg-1",
            "provider_id": "openai",
            "is_default_for_provider": False,
            "status": "valid",
        }
    )

    k2 = encrypt_key("sk-key-default")
    k2.update(
        {
            "id": "key-def-2",
            "provider_id": "openai",
            "is_default_for_provider": True,
            "status": "valid",
        }
    )

    class MockQuery:
        def __init__(self, data):
            self.data = data

        def select(self, *a, **kw):
            return self

        def eq(self, *a, **kw):
            return self

        def neq(self, *a, **kw):
            return self

        def execute(self):
            return self

    class MockSupabase:
        def table(self, name: str):
            if name == "user_model_preferences":
                return MockQuery([{"mode": "manual", "model_id": "gpt-4o"}])
            if name == "user_api_keys":
                # k1 comes first, but k2 is marked default
                return MockQuery([k1, k2])
            return MockQuery([])

    monkeypatch.setattr("backend.core.byok.get_supabase_admin", lambda: MockSupabase())

    cfg = await resolve_user_byok(TEST_USER["user_id"])
    assert cfg is not None
    assert cfg["provider"] == "openai"
    # Must select k2 (sk-key-default), not k1
    assert cfg["api_key"] == "sk-key-default"


@pytest.mark.asyncio
async def test_resolve_user_byok_respects_provider_credential_id(monkeypatch):
    """When provider_credential_id is set in preferences, use that specific key."""
    k1 = encrypt_key("sk-key-regular")
    k1.update(
        {
            "id": "key-reg-1",
            "provider_id": "openai",
            "is_default_for_provider": False,
            "status": "valid",
        }
    )

    k2 = encrypt_key("sk-key-default")
    k2.update(
        {
            "id": "key-def-2",
            "provider_id": "openai",
            "is_default_for_provider": True,
            "status": "valid",
        }
    )

    class MockQuery:
        def __init__(self, data):
            self.data = data

        def select(self, *a, **kw):
            return self

        def eq(self, *a, **kw):
            return self

        def neq(self, *a, **kw):
            return self

        def execute(self):
            return self

    class MockSupabase:
        def table(self, name: str):
            if name == "user_model_preferences":
                # User explicitly selected key-reg-1 over default key-def-2
                return MockQuery(
                    [
                        {
                            "mode": "manual",
                            "model_id": "gpt-4o",
                            "provider_credential_id": "key-reg-1",
                        }
                    ]
                )
            if name == "user_api_keys":
                return MockQuery([k2, k1])
            return MockQuery([])

    monkeypatch.setattr("backend.core.byok.get_supabase_admin", lambda: MockSupabase())

    cfg = await resolve_user_byok(TEST_USER["user_id"])
    assert cfg is not None
    assert cfg["provider"] == "openai"
    # Must select k1 as explicitly specified by provider_credential_id
    assert cfg["api_key"] == "sk-key-regular"
