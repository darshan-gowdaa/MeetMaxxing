import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.auth import get_current_user

VALID_MEETING_ID = "11111111-2222-3333-4444-555555555555"


class MockTable:
    def __init__(self, name: str, data_store: dict):
        self.name = name
        self.store = data_store
        self._filters: list[tuple[str, str]] = []

    def select(self, *cols, count=None):
        return self

    def eq(self, col: str, val):
        self._filters.append((col, str(val)))
        return self

    def order(self, col: str, desc: bool = False):
        return self

    def execute(self):
        rows = self.store.setdefault(self.name, [])
        filtered = []
        for r in rows:
            match = True
            for col, val in self._filters:
                if str(r.get(col, "")) != str(val):
                    match = False
                    break
            if match:
                filtered.append(dict(r))
        self._filters.clear()

        class Result:
            data = filtered
            count = len(filtered)

        return Result()


class MockSupabase:
    def __init__(self, data_store: dict):
        self.store = data_store

    def table(self, name: str):
        return MockTable(name, self.store)


@pytest.fixture
def mock_db():
    store = {
        "meetings": [
            {
                "id": VALID_MEETING_ID,
                "org_id": "test-org-1",
                "title": "Meet - hsh-zaaw-ern",
                "google_meet_link": "https://meet.google.com/hsh-zaaw-ern",
                "summary": "Audio and connection technical check. Speaker tested microphone setup with zero issues.",
                "decisions": [{"text": "Proceed with deployment"}],
                "action_items": [],
            }
        ]
    }
    return MockSupabase(store)


@pytest.fixture
def client(monkeypatch, mock_db):
    user_override = {
        "user_id": "user-456",
        "id": "user-456",
        "org_id": "test-org-1",
        "email": "tester@example.com",
    }
    app.dependency_overrides[get_current_user] = lambda: user_override
    monkeypatch.setattr(
        "backend.api.routes_dashboard.get_supabase_admin", lambda: mock_db
    )
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_suggest_meeting_title_success(client):
    resp = client.post(f"/dashboard/meetings/{VALID_MEETING_ID}/suggest-title")
    assert resp.status_code == 200
    data = resp.json()
    assert "suggested_title" in data
    assert isinstance(data["suggested_title"], str)
    assert len(data["suggested_title"]) > 0
    assert "alternatives" in data
    assert isinstance(data["alternatives"], list)
    assert len(data["alternatives"]) >= 1


def test_suggest_meeting_title_not_found(client):
    resp = client.post(
        "/dashboard/meetings/99999999-9999-9999-9999-999999999999/suggest-title"
    )
    assert resp.status_code == 404
