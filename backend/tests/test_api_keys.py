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
