"""Tests for user settings API routes (/api/settings/*)."""

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


# ── GET /api/settings/ ────────────────────────────────────────────────────────
def test_get_settings_defaults(auth_client, monkeypatch):
    client, user = auth_client
    store = {"users": [{"id": user["user_id"], "email": user["email"]}]}
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    resp = client.get("/api/settings/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["theme"] == "system"
    assert data["compact_view"] is False and data["compact_meeting_cards"] is False
    assert data["high_contrast"] is False and data["high_contrast_mode"] is False
    assert data["timezone"] == "UTC"
    assert data["default_meeting_duration"] == 30 and data["meeting_duration"] == 30
    assert data["auto_extract_actions"] is True
    assert data["language"] == "en" and data["summary_style"] == "concise"
    assert data["org_name"] == ""
    assert data["notifications"] == {
        "email": True,
        "reminders": True,
        "in_app": True,
        "prep_lead_time_minutes": 15,
        "action_item_reminders": True,
        "digest_time": "09:00",
    }


def test_get_settings_populated(auth_client, monkeypatch):
    client, user = auth_client
    notifs = {
        "compact_view": True,
        "high_contrast": True,
        "timezone": "America/New_York",
        "default_meeting_duration": 45,
        "auto_extract_actions": False,
        "language": "es",
        "summary_style": "detailed",
        "org_name": "Test Org",
        "notifications": {
            "email": False,
            "reminders": True,
            "in_app": False,
            "prep_lead_time_minutes": 10,
            "action_item_reminders": False,
            "digest_time": "18:00",
        },
    }
    store = {
        "users": [{"id": user["user_id"], "theme": "dark", "notifications": notifs}]
    }
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    data = client.get("/api/settings/").json()
    assert (
        data["theme"] == "dark"
        and data["compact_view"] is True
        and data["high_contrast"] is True
    )
    assert (
        data["timezone"] == "America/New_York"
        and data["default_meeting_duration"] == 45
    )
    assert data["auto_extract_actions"] is False and data["language"] == "es"
    assert data["summary_style"] == "detailed" and data["org_name"] == "Test Org"
    assert (
        data["notifications"]["email"] is False
        and data["notifications"]["prep_lead_time_minutes"] == 10
    )
    assert data["notifications"]["digest_time"] == "18:00"


# ── PATCH /api/settings/ General Settings ─────────────────────────────────────
def test_patch_settings_general_and_notifs(auth_client, monkeypatch):
    client, user = auth_client
    store = {"users": [{"id": user["user_id"], "email": user["email"]}]}
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    payload = {
        "theme": "dark",
        "language": "fr",
        "summary_style": "action-focused",
        "meeting_duration": 45,
        "auto_extract_actions": False,
        "timezone": "Asia/Tokyo",
        "org_name": "Christ University",
        "notifications": {"email": False, "digest_time": "08:30"},
    }
    resp = client.patch("/api/settings/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["theme"] == "dark"
    assert data["language"] == "fr" and data["summary_style"] == "action-focused"
    assert data["meeting_duration"] == 45 and data["default_meeting_duration"] == 45
    assert data["auto_extract_actions"] is False and data["timezone"] == "Asia/Tokyo"
    assert data["org_name"] == "Christ University"
    assert (
        data["notifications"]["email"] is False
        and data["notifications"]["digest_time"] == "08:30"
    )
    assert data["notifications"]["reminders"] is True

    notifs = store["users"][0]["notifications"]
    assert notifs["language"] == "fr" and notifs["summary_style"] == "action-focused"
    assert (
        notifs["default_meeting_duration"] == 45
        and notifs["auto_extract_actions"] is False
    )
    assert notifs["timezone"] == "Asia/Tokyo"


def test_patch_settings_aliases_and_integrations(auth_client, monkeypatch):
    client, user = auth_client
    store = {"users": [{"id": user["user_id"], "email": user["email"]}]}
    mock_db = MockSupabaseAdmin(store)
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: mock_db,
    )

    alias_payload = {
        "compact_meeting_cards": True,
        "high_contrast_mode": True,
        "meeting_duration": 45,
        "display_name": "Jane Doe",
        "avatar_url": "https://cdn.example.com/jane.jpg",
        "integrations": {
            "zoom_webhook": "https://hooks.zoom.us/test",
            "slack_webhook": "https://hooks.slack.com/services/T/B/X",
            "notion_api_key": "ntn_secret_999",
            "notion_database_id": "notion-db-123",
        },
    }
    resp = client.patch("/api/settings/", json=alias_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["compact_view"] is True and data["compact_meeting_cards"] is True
    assert data["high_contrast"] is True and data["high_contrast_mode"] is True
    assert data["default_meeting_duration"] == 45 and data["meeting_duration"] == 45
    assert (
        data["name"] == "Jane Doe"
        and data["avatar_url"] == "https://cdn.example.com/jane.jpg"
    )
    assert data["integrations"]["notion_db_id"] == "notion-db-123"
    assert (
        mock_db.auth.admin.updated_users[user["user_id"]]["user_metadata"]["name"]
        == "Jane Doe"
    )


def test_patch_settings_invalid_and_fallback(auth_client, monkeypatch):
    client, user = auth_client
    store = {"users": [{"id": user["user_id"]}]}
    mock_db = MockSupabaseAdmin(store, should_fail_theme=True)
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: mock_db,
    )

    assert (
        client.patch("/api/settings/", json={"unknown_key": "val"}).status_code == 400
    )
    resp = client.patch("/api/settings/", json={"theme": "dark", "compact_view": True})
    assert resp.status_code == 200 and resp.json()["theme"] == "dark"
    assert store["users"][0]["notifications"]["theme"] == "dark"


# ── POST /api/settings/reset ──────────────────────────────────────────────────
def test_post_settings_reset(auth_client, monkeypatch):
    client, user = auth_client
    custom_notifs = {
        "language": "es",
        "summary_style": "detailed",
        "meeting_duration": 60,
        "auto_extract_actions": False,
        "timezone": "Europe/Paris",
        "compact_view": True,
        "high_contrast": True,
        "integrations": {
            "zoom_webhook": "https://hooks.zoom.us/old",
            "notion_db_id": "1",
        },
    }
    store = {
        "users": [
            {"id": user["user_id"], "theme": "dark", "notifications": custom_notifs}
        ]
    }
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    resp = client.post("/api/settings/reset")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True and "reset successfully" in data["message"].lower()

    current = client.get("/api/settings/").json()
    assert (
        current["theme"] == "system"
        and current["language"] == "en"
        and current["summary_style"] == "concise"
    )
    assert (
        current["meeting_duration"] == 30 and current["default_meeting_duration"] == 30
    )
    assert current["auto_extract_actions"] is True and current["timezone"] == "UTC"
    assert (
        current["compact_view"] is False and current["compact_meeting_cards"] is False
    )
    assert current["high_contrast"] is False and current["high_contrast_mode"] is False
    assert current["integrations"] == {
        "zoom_webhook": "",
        "slack_webhook": "",
        "notion_api_key": "",
        "notion_db_id": "",
    }
