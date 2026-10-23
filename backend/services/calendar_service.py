"""
Google Calendar API service wrapper.
Handles OAuth2 token management and event CRUD.
"""

import base64
from datetime import UTC, datetime, timedelta
import json
import logging
import os
import re
import uuid

from fastapi.concurrency import run_in_threadpool
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import httpx

from ..core.config import settings

# Relax OAuthLib scope strictness to handle Google adding default openid/userinfo scopes
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

MEET_URL_REGEX = re.compile(
    r"https?://meet\.google\.com/[a-z0-9\-]+", re.IGNORECASE
)


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


def _extract_meet_link(it: dict) -> str | None:
    """
    Extract Google Meet video call URL from event hangoutLink, conferenceData,
    location, or description. Returns canonical URL or None.
    """
    if it.get("hangoutLink"):
        return it["hangoutLink"]

    conf_data = it.get("conferenceData") or {}
    for ep in conf_data.get("entryPoints", []):
        uri = ep.get("uri") or ""
        if "meet.google.com" in uri:
            return uri

    loc = it.get("location") or ""
    loc_match = MEET_URL_REGEX.search(loc)
    if loc_match:
        return loc_match.group(0)

    desc = it.get("description") or ""
    desc_match = MEET_URL_REGEX.search(desc)
    if desc_match:
        return desc_match.group(0)

    return None


async def list_upcoming_events(
    token_data: dict, max_results: int = 25, only_meet: bool = False
) -> list[dict]:
    """Fetch next upcoming calendar events for the connected user.
    If only_meet is True, returns only meetings with a valid Google Meet link.
    """
    if not token_data or not (
        token_data.get("access_token") or token_data.get("refresh_token")
    ):
        return []

    def _list() -> list[dict]:
        service = _build_service(token_data)
        now_iso = datetime.now(UTC).isoformat()
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=now_iso,
                maxResults=max_results,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        items = events_result.get("items", [])
        clean_events = []
        for it in items:
            meet_link = _extract_meet_link(it)
            if only_meet and not meet_link:
                continue

            start = it.get("start", {}).get("dateTime") or it.get("start", {}).get(
                "date"
            )
            end = it.get("end", {}).get("dateTime") or it.get("end", {}).get("date")
            clean_events.append(
                {
                    "id": it.get("id"),
                    "summary": it.get("summary") or "Untitled Meeting",
                    "start": start,
                    "end": end,
                    "html_link": it.get("htmlLink"),
                    "hangout_link": meet_link,
                    "attendees_count": len(it.get("attendees") or []),
                }
            )
        return clean_events

    try:
        return await run_in_threadpool(_list)
    except Exception as e:
        logging.warning(f"Failed to list calendar events: {e}")
        return []


async def create_test_event(token_data: dict) -> dict:
    """Create a 15-min sample 'MeetMaxxing Copilot Sync Test' event with Google Meet link."""
    now = datetime.now(UTC) + timedelta(hours=1)
    event_start = now.replace(minute=0, second=0, microsecond=0)
    event_end = event_start + timedelta(minutes=15)

    random_code = f"mmx-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:3]}"
    test_meet_url = f"https://meet.google.com/{random_code}"

    payload = {
        "summary": "MeetMaxxing Copilot • Calendar Sync Test",
        "description": f"Test event verified and scheduled by MeetMaxxing AI meeting copilot.\nGoogle Meet: {test_meet_url}",
        "location": test_meet_url,
        "start": {"dateTime": event_start.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": event_end.isoformat(), "timeZone": "UTC"},
        "reminders": {"useDefault": True},
    }
    return await create_calendar_event(payload, token_data)


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
