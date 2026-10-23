"""
Unit tests for Google Calendar OAuth routes, diagnostics, and callback redirects.
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from backend.core.config import settings
from backend.main import app


@pytest.fixture
def auth_override():
    from backend.core.auth import get_current_user

    user = {
        "user_id": "test-user-123",
        "id": "test-user-123",
        "org_id": "org-calendar-test",
        "email": "test@example.com",
    }
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_calendar_oauth_diagnostics():
    """Verify the /calendar/oauth-diagnostics endpoint returns required redirect URIs."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/calendar/oauth-diagnostics")
        assert res.status_code == 200
        data = res.json()
        assert "active_redirect_uri" in data
        assert "required_authorized_redirect_uris" in data
        assert (
            "https://meetmaxxing-api.onrender.com/calendar/callback"
            in data["required_authorized_redirect_uris"]
        )
        assert (
            "http://localhost:8000/calendar/callback"
            in data["required_authorized_redirect_uris"]
        )


@pytest.mark.asyncio
async def test_calendar_auth_url_endpoint(auth_override):
    """Verify /calendar/auth-url generates an OAuth consent URL with state and redirect_uri."""
    with (
        patch(
            "backend.api.routes_calendar.get_calendar_auth_url",
            new_callable=AsyncMock,
        ) as mock_auth_url,
        patch.object(
            settings,
            "GOOGLE_CLIENT_ID",
            "test-client-id.apps.googleusercontent.com",
        ),
    ):
        mock_auth_url.return_value = "https://accounts.google.com/o/oauth2/auth?client_id=test&response_type=code"
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://localhost:8000"
        ) as client:
            res = await client.get("/calendar/auth-url")
            assert res.status_code == 200
            data = res.json()
            assert "auth_url" in data
            assert "state" in data
            assert data["redirect_uri"].endswith("/calendar/callback")


@pytest.mark.asyncio
async def test_calendar_callback_error_redirect():
    """Verify OAuth callback with error redirects browser back to frontend with error param."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://localhost:8000",
        follow_redirects=False,
    ) as client:
        res = await client.get(
            "/calendar/callback?error=access_denied&state=",
            headers={"accept": "text/html"},
        )
        assert res.status_code == 302
        assert "calendar_error=access_denied" in res.headers["location"]


@pytest.mark.asyncio
async def test_calendar_callback_success_redirect():
    """Verify successful OAuth callback redirects browser to frontend settings with calendar=connected."""
    with (
        patch(
            "backend.api.routes_calendar.exchange_calendar_code",
            new_callable=AsyncMock,
        ) as mock_exchange,
        patch("backend.api.routes_calendar.get_supabase_admin") as mock_supabase,
    ):
        mock_exchange.return_value = {
            "access_token": "mock-access-token",
            "refresh_token": "mock-refresh-token",
            "token_uri": "https://oauth2.googleapis.com/token",
            "scopes": ["https://www.googleapis.com/auth/calendar.events"],
        }
        mock_table = AsyncMock()
        mock_supabase.return_value.table.return_value = mock_table
        mock_table.update.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = None

        import base64
        import json

        state_encoded = base64.urlsafe_b64encode(
            json.dumps({"user_id": "test-user-123"}).encode()
        ).decode()

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://localhost:8000",
            follow_redirects=False,
        ) as client:
            res = await client.get(
                f"/calendar/callback?code=mock-code&state={state_encoded}",
                headers={"accept": "text/html"},
            )
            assert res.status_code == 302
            assert "calendar=connected" in res.headers["location"]
