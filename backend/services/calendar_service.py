"""
Google Calendar API service wrapper.
Handles OAuth2 token management and event CRUD.
"""

import base64
import json
import logging
import os

from fastapi.concurrency import run_in_threadpool
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import httpx

from ..core.config import settings

# Relax OAuthLib scope strictness to handle Google adding default openid/userinfo scopes
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"


def _extract_email_from_jwt(id_token_jwt: str) -> str | None:
    """Extract email claim from Google ID token JWT without external signature verification."""
    try:
        parts = id_token_jwt.split(".")
        if len(parts) >= 2:
            payload = parts[1]
            padded = payload + "=" * (-len(payload) % 4)
            claims = json.loads(
                base64.urlsafe_b64decode(padded.encode()).decode("utf-8")
            )
            return claims.get("email")
    except Exception:
        pass
    return None


async def _direct_token_exchange(
    code: str,
    redirect_uri: str,
    code_verifier: str | None = None,
) -> dict:
    """Fallback: exchange authorization code directly via Google's token endpoint (avoids oauthlib scope errors)."""
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    if code_verifier:
        payload["code_verifier"] = code_verifier

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        data = resp.json()
        if resp.status_code != 200:
            error_desc = data.get("error_description") or data.get("error") or resp.text
            raise RuntimeError(f"Google token error: {error_desc}")

        email = None
        if data.get("id_token"):
            email = _extract_email_from_jwt(data["id_token"])

        raw_scope = data.get("scope") or ""
        scopes = raw_scope.split() if isinstance(raw_scope, str) else list(raw_scope)

        return {
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
            "token_uri": "https://oauth2.googleapis.com/token",
            "scopes": scopes,
            "email": email,
        }


def _build_flow(redirect_uri: str | None = None, code_verifier: str | None = None):
    """Build Google OAuth2 Flow from settings (shared by auth URL + code exchange)."""
    from google_auth_oauthlib.flow import Flow

    effective_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
    known_uris = list(
        dict.fromkeys(
            [
                effective_uri,
                settings.GOOGLE_REDIRECT_URI,
                "https://meetmaxxing-api.onrender.com/calendar/callback",
                "https://meetmaxxing-api.onrender.com/calendar/callback/",
                "https://meetmaxxing-api.onrender.com/api/calendar/callback",
                "https://meetmaxxing-api.onrender.com/api/calendar/callback/",
                "http://localhost:8000/calendar/callback",
                "http://localhost:8000/calendar/callback/",
                "http://localhost:8000/api/calendar/callback",
                "http://localhost:8000/api/calendar/callback/",
                "http://127.0.0.1:8000/calendar/callback",
                "http://127.0.0.1:8000/calendar/callback/",
                "http://127.0.0.1:8000/api/calendar/callback",
                "http://127.0.0.1:8000/api/calendar/callback/",
            ]
        )
    )

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": known_uris,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=settings.GOOGLE_CALENDAR_SCOPES,
        redirect_uri=effective_uri,
    )
    # Confidential web client with client_secret does not require PKCE code_challenge;
    # disabling autogenerate prevents "Missing code verifier" when exchanging code across requests.
    flow.autogenerate_code_verifier = False
    if code_verifier:
        flow.code_verifier = code_verifier
    return flow


def _build_service(token_data: dict):
    """Build Google Calendar service from stored OAuth token dict."""
    creds = Credentials(
        token=token_data.get("access_token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=settings.GOOGLE_CALENDAR_SCOPES,
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build("calendar", "v3", credentials=creds)


async def create_calendar_event(event_body: dict, token_data: dict) -> dict:
    """
    Create a Google Calendar event and return the created event dict.
    event_body: Full Google Calendar event resource dict.
    token_data: OAuth2 token dict stored for the user.
    """
    if not token_data or not token_data.get("access_token"):
        raise ValueError("Missing OAuth token data")

    def _create() -> dict:
        service = _build_service(token_data)
        return (
            service.events()
            .insert(
                calendarId="primary",
                body=event_body,
                sendUpdates="all",
            )
            .execute()
        )

    try:
        return await run_in_threadpool(_create)
    except HttpError as e:
        raise RuntimeError(f"Calendar API error: {e.status_code} — {e.reason}")
    except Exception as e:
        raise RuntimeError(f"Failed to create event: {e}")


async def get_calendar_auth_url(
    state: str | None = None, redirect_uri: str | None = None
) -> str:
    """Generate Google OAuth2 authorization URL for Calendar access."""
    flow = _build_flow(redirect_uri=redirect_uri)
    auth_kwargs = {
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
    }
    if state:
        auth_kwargs["state"] = state
    auth_url, _ = flow.authorization_url(**auth_kwargs)
    return auth_url


async def exchange_calendar_code(
    code: str,
    redirect_uri: str | None = None,
    code_verifier: str | None = None,
) -> dict:
    """Exchange OAuth2 authorization code for tokens directly via Google token endpoint."""
    effective_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
    return await _direct_token_exchange(
        code=code,
        redirect_uri=effective_uri,
        code_verifier=code_verifier,
    )
