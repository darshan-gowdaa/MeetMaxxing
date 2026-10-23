import base64
import json
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.auth import get_current_user
from backend.core.config import settings


class MockTable:
    def __init__(self, name: str, data_store: dict, should_fail_theme: bool = False):
        self.name = name
        self.store = data_store
        self._should_fail_theme = should_fail_theme
        self._filters: list[tuple[str, str]] = []
        self._in_filters: list[tuple[str, list]] = []
        self._order_by: tuple[str, bool] | None = None
        self._action = "select"
        self._action_data: dict | None = None

    def select(self, *cols):
        self._action = "select"
        return self

    def eq(self, col: str, val):
        self._filters.append((col, str(val)))
        return self

    def in_(self, col: str, values):
        self._in_filters.append((col, list(values)))
        return self

    def order(self, col: str, desc: bool = False):
        self._order_by = (col, desc)
        return self

    def single(self):
        return self

    def limit(self, n: int):
        return self

    def update(self, data: dict):
        if self._should_fail_theme and "theme" in data:
            raise RuntimeError("Column 'theme' does not exist in 'users' table")
        self._action = "update"
        self._action_data = data
        return self

    def upsert(self, data: dict, on_conflict: str = "id"):
        if self._should_fail_theme and "theme" in data:
            raise RuntimeError("Column 'theme' does not exist in 'users' table")
        self._action = "upsert"
        self._action_data = data
        return self

    def execute(self):
        rows = self.store.setdefault(self.name, [])

        def matches(row):
            for col, val in self._filters:
                if str(row.get(col)) != str(val):
                    return False
            for col, vals in self._in_filters:
                if row.get(col) not in vals:
                    return False
            return True

        class Result:
            def __init__(self, data):
                self.data = data

        if self._action == "select":
            matched = [dict(r) for r in rows if matches(r)]
            if self._order_by:
                col, desc = self._order_by
                matched = sorted(
                    matched, key=lambda x: str(x.get(col, "")), reverse=desc
                )
            return Result(matched)

        elif self._action == "update":
            matched = []
            for r in rows:
                if matches(r):
                    r.update(self._action_data or {})
                    matched.append(dict(r))
            return Result(matched)

        elif self._action == "upsert":
            data = dict(self._action_data or {})
            rec_id = data.get("id")
            for r in rows:
                if r.get("id") == rec_id:
                    r.update(data)
                    return Result([dict(r)])
            rows.append(data)
            return Result([dict(data)])

        return Result([])


class MockSupabaseAdmin:
    def __init__(self, data_store: dict, should_fail_theme: bool = False):
        self.store = data_store
        self.should_fail_theme = should_fail_theme

    def table(self, name: str):
        return MockTable(name, self.store, self.should_fail_theme)


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


# ── GET /api/settings/ Tests ──────────────────────────────────────────────────
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
    assert data["compact_view"] is False
    assert data["high_contrast"] is False
    assert data["timezone"] == "UTC"
    assert data["default_meeting_duration"] == 30
    assert data["auto_extract_actions"] is True
    assert data["language"] == "en"
    assert data["summary_style"] == "concise"
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
    store = {
        "users": [
            {
                "id": user["user_id"],
                "theme": "dark",
                "notifications": {
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
                },
            }
        ]
    }
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    resp = client.get("/api/settings/")
    assert resp.status_code == 200
    data = resp.json()

    assert data["theme"] == "dark"
    assert data["compact_view"] is True
    assert data["high_contrast"] is True
    assert data["timezone"] == "America/New_York"
    assert data["default_meeting_duration"] == 45
    assert data["auto_extract_actions"] is False
    assert data["language"] == "es"
    assert data["summary_style"] == "detailed"
    assert data["org_name"] == "Test Org"
    assert data["notifications"]["email"] is False
    assert data["notifications"]["prep_lead_time_minutes"] == 10
    assert data["notifications"]["digest_time"] == "18:00"


# ── PATCH /api/settings/ Tests ────────────────────────────────────────────────
def test_patch_settings_scalars_and_notifs(auth_client, monkeypatch):
    client, user = auth_client
    store = {"users": [{"id": user["user_id"], "email": user["email"]}]}
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    patch_payload = {
        "theme": "dark",
        "compact_view": True,
        "timezone": "Europe/London",
        "default_meeting_duration": 60,
        "auto_extract_actions": True,
        "language": "fr",
        "summary_style": "action-focused",
        "org_name": "Christ University",
        "notifications": {
            "email": False,
            "digest_time": "08:30",
        },
    }

    resp = client.patch("/api/settings/", json=patch_payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["theme"] == "dark"
    assert data["compact_view"] is True
    assert data["timezone"] == "Europe/London"
    assert data["default_meeting_duration"] == 60
    assert data["language"] == "fr"
    assert data["summary_style"] == "action-focused"
    assert data["org_name"] == "Christ University"
    assert data["notifications"]["email"] is False
    assert data["notifications"]["digest_time"] == "08:30"
    # Defaults preserved for unmentioned notification fields
    assert data["notifications"]["reminders"] is True
    assert data["notifications"]["prep_lead_time_minutes"] == 15

    # Verify database store was updated
    user_row = store["users"][0]
    assert user_row["theme"] == "dark"
    assert user_row["notifications"]["timezone"] == "Europe/London"
    assert user_row["notifications"]["compact_view"] is True


def test_patch_settings_invalid_empty(auth_client, monkeypatch):
    client, user = auth_client
    store = {"users": [{"id": user["user_id"]}]}
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: MockSupabaseAdmin(store),
    )

    resp = client.patch("/api/settings/", json={"unknown_key": "val"})
    assert resp.status_code == 400


def test_patch_settings_fallback_missing_column(auth_client, monkeypatch):
    client, user = auth_client
    store = {"users": [{"id": user["user_id"], "notifications": {}}]}
    # Simulate DB where 'theme' column does not exist on table users
    mock_db = MockSupabaseAdmin(store, should_fail_theme=True)
    monkeypatch.setattr(
        "backend.api.routes_settings.get_supabase_admin",
        lambda: mock_db,
    )

    resp = client.patch("/api/settings/", json={"theme": "dark", "compact_view": True})
    assert resp.status_code == 200
    data = resp.json()
    assert data["theme"] == "dark"
    assert data["compact_view"] is True
    # Notifications JSON contains theme as fallback
    assert store["users"][0]["notifications"]["theme"] == "dark"


# ── POST /api/settings/export Tests ───────────────────────────────────────────
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
    assert "user" in export
    assert "settings" in export
    assert "meetings" in export
    assert "action_items" in export

    # Redacted sensitive tokens
    assert export["user"]["calendar_token"] == "[CONNECTED]"
    assert export["user"]["id"] == user["user_id"]

    # Meetings & transcripts verified
    assert len(export["meetings"]) == 1
    assert export["meetings"][0]["title"] == "Quarterly Planning"
    assert export["meetings"][0]["transcript_data"][0]["speaker"] == "Alice"

    # Action items verified
    assert len(export["action_items"]) == 1
    assert export["action_items"][0]["description"] == "Send follow up email"


# ── GET /calendar/status Tests ────────────────────────────────────────────────
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


# ── Additional Calendar Route Tests ───────────────────────────────────────────
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

    # Verify user_id is properly encoded in state
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

    # Verify token persisted to users table
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
