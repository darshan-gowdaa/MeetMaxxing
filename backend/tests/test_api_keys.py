import pytest
from backend.api.routes_api_keys import _encrypt_key, _decrypt_key, REGISTRY

def test_encryption_decryption():
    plaintext = "sk-ant-test-key-12345"
    enc = _encrypt_key(plaintext)
    
    assert "key_ciphertext" in enc
    assert "wrapped_dek" in enc
    assert enc["key_ciphertext"] != plaintext
    assert enc["last4"] == "2345"
    
    decrypted = _decrypt_key(enc)
    assert decrypted == plaintext

@pytest.mark.asyncio
async def test_registry():
    assert "openai" in REGISTRY
    assert "anthropic" in REGISTRY
    
    # Check that dummy validate won't crash if network unavailable
    openai = REGISTRY["openai"]
    status, _msg = await openai.validate("invalid_key")
    assert status in ["invalid", "unavailable"]

def test_no_plaintext_leak():
    plaintext = "sk-secret-test-999"
    enc = _encrypt_key(plaintext)
    assert plaintext not in str(enc)


@pytest.mark.asyncio
async def test_byok_resolution_mock(monkeypatch):
    from backend.core.byok import resolve_user_byok, invalidate_user_byok_cache

    test_uid = "u-byok-test-123"
    invalidate_user_byok_cache(test_uid)

    mock_key_record = _encrypt_key("sk-openai-test-9999")
    mock_key_record["provider_id"] = "openai"
    mock_key_record["user_id"] = test_uid
    mock_key_record["status"] = "valid"

    class MockQuery:
        def __init__(self, data):
            self.data = data
        def select(self, *a, **kw): return self
        def eq(self, *a, **kw): return self
        def neq(self, *a, **kw): return self
        def execute(self): return self

    class MockSupabase:
        def table(self, name: str):
            if name == "user_model_preferences":
                return MockQuery([{"mode": "manual", "model_id": "gpt-4o"}])
            if name == "user_api_keys":
                return MockQuery([mock_key_record])
            return MockQuery([])

    monkeypatch.setattr("backend.core.byok.get_supabase_admin", lambda: MockSupabase())

    cfg = await resolve_user_byok(test_uid)
    assert cfg is not None
    assert cfg["provider"] == "openai"
    assert cfg["model"] == "gpt-4o"
    assert cfg["api_key"] == "sk-openai-test-9999"

    # Test cache invalidation
    invalidate_user_byok_cache(test_uid)


@pytest.mark.asyncio
async def test_generate_content_byok_flow(monkeypatch):
    from backend.core.llm_fallback import generate_content_with_fallback

    test_uid = "u-byok-test-flow"

    async def mock_resolve(uid):
        if uid == test_uid:
            return {"provider": "groq", "model": "llama-3.1-70b-versatile", "api_key": "gsk-mock"}
        return None

    async def mock_call(**kwargs):
        return '{"result": "success"}'

    monkeypatch.setattr("backend.core.byok.resolve_user_byok", mock_resolve)
    monkeypatch.setattr("backend.core.byok.call_byok_provider", mock_call)

    text, powered_by = await generate_content_with_fallback(
        "test prompt",
        user_id=test_uid,
        bypass_cache=True,
    )
    assert "success" in text
    assert "BYOK: Groq (llama-3.1-70b-versatile)" in powered_by

