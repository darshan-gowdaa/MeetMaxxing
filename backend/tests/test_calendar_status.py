"""
Tests for Google Calendar connection status, OAuth state callback, and disconnect endpoints.
"""

import base64
import json
import pytest
from fastapi.testclient import TestClient

from backend.core.auth import get_current_user
from backend.core.config import settings
from backend.main import app
from backend.tests.mock_db import MockSupabaseAdmin


@pytest.fixture
def auth_client():
    test_user = {
        "user_id": "usr-test-123",
        "org_id": "org-test-456",
        "email": "tester@example.com",
    }
    app.dependency_overrides[get_current_user] = lambda: test_user
    with TestClient(app) as client:
        yield client, test_user
    app.dependency_overrides.pop(get_current_user, None)


def test_calendar_status_disconnected(auth_client, monkeypatch):
    client, user = auth_client
    store = {
        "users": [
            {"id": user["user_id"], "email": user["email"], "calendar_token": None}
        ]
    }
    monkeypatch.setattr(
        "backend.api.routes_calendar.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    resp = client.get("/calendar/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["connected"] is False
    assert data["email"] is None
    assert data["last_synced_at"] is None


def test_calendar_status_connected(auth_client, monkeypatch):
    client, user = auth_client
    store = {
        "users": [
            {
                "id": user["user_id"],
                "email": user["email"],
                "calendar_token": {
                    "access_token": "ya29.test-access-token",
                    "refresh_token": "rt.test-refresh-token",
                    "email": "work-calendar@example.com",
                    "last_synced_at": "2026-10-23T02:00:00Z",
                },
            }
        ]
    }
    monkeypatch.setattr(
        "backend.api.routes_calendar.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    resp = client.get("/calendar/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["connected"] is True
    assert data["email"] == "work-calendar@example.com"
    assert data["last_synced_at"] == "2026-10-23T02:00:00Z"


def test_calendar_auth_url_and_state(auth_client, monkeypatch):
    client, user = auth_client
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-gcal-client-id")

    async def mock_auth_url(state=None):
        return f"https://accounts.google.com/o/oauth2/auth?state={state}"

    monkeypatch.setattr(
        "backend.api.routes_calendar.get_calendar_auth_url",
        mock_auth_url,
    )

    resp = client.get("/calendar/auth-url")
    assert resp.status_code == 200
    data = resp.json()
    assert "auth_url" in data
    assert "state" in data

    state_decoded = json.loads(
        base64.urlsafe_b64decode(data["state"].encode()).decode()
    )
    assert state_decoded["user_id"] == user["user_id"]


def test_calendar_callback_persists_token(auth_client, monkeypatch):
    client, user = auth_client
    store = {
        "users": [
            {"id": user["user_id"], "email": user["email"], "calendar_token": None}
        ]
    }
    monkeypatch.setattr(
        "backend.api.routes_calendar.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    async def mock_exchange(code):
        return {
            "access_token": "ya29.new-access-token",
            "refresh_token": "rt.new-refresh-token",
            "token_uri": "https://oauth2.googleapis.com/token",
            "scopes": ["https://www.googleapis.com/auth/calendar"],
        }

    monkeypatch.setattr(
        "backend.api.routes_calendar.exchange_calendar_code",
        mock_exchange,
    )

    state = base64.urlsafe_b64encode(
        json.dumps({"user_id": user["user_id"]}).encode()
    ).decode()
    resp = client.get(f"/calendar/callback?code=mock-auth-code&state={state}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "connected"

    persisted_token = store["users"][0]["calendar_token"]
    assert persisted_token is not None
    assert persisted_token["access_token"] == "ya29.new-access-token"
    assert "last_synced_at" in persisted_token


def test_calendar_disconnect(auth_client, monkeypatch):
    client, user = auth_client
    store = {
        "users": [
            {
                "id": user["user_id"],
                "calendar_token": {"access_token": "valid_token"},
            }
        ]
    }
    monkeypatch.setattr(
        "backend.api.routes_calendar.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    resp = client.post("/calendar/disconnect")
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert store["users"][0]["calendar_token"] is None
