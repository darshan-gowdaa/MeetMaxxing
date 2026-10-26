"""
Tests for settings data and dispatch actions (/api/settings/test-notification, /api/settings/avatar, /api/settings/export).
"""

import pytest
from fastapi.testclient import TestClient

from backend.core.auth import get_current_user
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


def test_post_test_notification(auth_client, monkeypatch):
    client, user = auth_client
    store = {
        "users": [
            {
                "id": user["user_id"],
                "email": user["email"],
                "notifications": {
                    "notifications": {
                        "in_app": True,
                        "email": False,
                        "reminders": True,
                        "action_items_due": True,
                    }
                },
            }
        ]
    }
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    resp = client.post("/api/settings/test-notification")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success" and data["user_id"] == user["user_id"]
    assert data["channels"]["in_app"] is True and data["channels"]["email"] is False
    assert data["channels"]["reminders"] is True


def test_post_avatar_json_and_multipart(auth_client, monkeypatch):
    client, user = auth_client
    store = {"users": [{"id": user["user_id"]}]}
    mock_db = MockSupabaseAdmin(store)
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: mock_db,
    )

    res_json = client.post(
        "/api/settings/avatar",
        json={"avatar_url": "https://images.example.com/avatars/u1.png"},
    )
    assert res_json.status_code == 200
    assert res_json.json()["avatar_url"] == "https://images.example.com/avatars/u1.png"

    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    res_file = client.post(
        "/api/settings/avatar",
        files={"file": ("profile_pic.png", fake_png, "image/png")},
    )
    assert res_file.status_code == 200
    assert "avatars/" in res_file.json()["avatar_url"]

    res_err = client.post("/api/settings/avatar", json={"avatar_url": ""})
    assert res_err.status_code == 400


def test_export_user_data(auth_client, monkeypatch):
    client, user = auth_client
    meeting_id = "meet-999"
    store = {
        "users": [
            {
                "id": user["user_id"],
                "org_id": user["org_id"],
                "email": user["email"],
                "calendar_token": {"access_token": "secret-oauth-token"},
            }
        ],
        "meetings": [
            {
                "id": meeting_id,
                "user_id": user["user_id"],
                "title": "Quarterly Planning",
                "transcript_data": [
                    {"speaker": "Alice", "text": "Let's begin", "timestamp_ms": 100}
                ],
                "summary": "Reviewed roadmap goals.",
                "action_items": [],
                "created_at": "2026-10-23T01:00:00Z",
            }
        ],
        "action_items": [
            {
                "id": "act-1",
                "meeting_id": meeting_id,
                "owner_id": user["user_id"],
                "description": "Send follow up email",
                "status": "open",
            }
        ],
    }
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    resp = client.post("/api/settings/export")
    assert resp.status_code == 200
    export = resp.json()
    assert "exported_at" in export
    assert export["user"]["calendar_token"] == "[CONNECTED]"
    assert len(export["meetings"]) == 1
    assert len(export["action_items"]) == 1
