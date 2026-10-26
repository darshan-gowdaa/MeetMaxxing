"""
Google Calendar OAuth flow + direct-link endpoints.
"""

import inspect
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_supabase_admin
from ..services.calendar_service import (
    create_test_event,
    exchange_calendar_code,
    get_calendar_auth_url,
    list_upcoming_events,
)
from ..services.calendar_sync import (
    DEFAULT_CALENDAR_PREFERENCES,
    CalendarPreferencesRequest,
    build_add_url_response,
    disconnect_user_calendar,
    get_oauth_diagnostics,
    get_user_calendar_status,
    handle_calendar_callback,
    prepare_calendar_auth,
    save_user_calendar_preferences,
    schedule_calendar_followup,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])


# ── GET /calendar/add-url?meeting_id=... ─────────────────────────────────────
@router.get("/add-url")
async def get_calendar_add_url(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """Return a Google Calendar 'Add Event' template URL built from meeting data."""
    supabase = get_supabase_admin()
    return build_add_url_response(supabase, meeting_id, user["org_id"])


# ── GET /calendar/oauth-diagnostics ───────────────────────────────────────────
@router.get("/oauth-diagnostics")
async def get_calendar_oauth_diagnostics(request: Request):
    """Return diagnostic info for Google Calendar OAuth configuration."""
    return get_oauth_diagnostics(request)


# ── GET /calendar/auth-url & /calendar/connect ────────────────────────────────
@router.get("/auth-url")
@router.get("/connect")
async def connect_calendar(
    request: Request,
    redirect_uri: str | None = None,
    frontend_origin: str | None = None,
    user: dict = Depends(get_current_user),
):
    """Redirect user to Google OAuth consent for Calendar API access."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=501,
            detail=(
                "Google OAuth not configured. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env, "
                "then register https://meetmaxxing-api.onrender.com/calendar/callback as an Authorized Redirect URI "
                "in Google Cloud Console."
            ),
        )

    state, eff_redirect = prepare_calendar_auth(
        request, user["user_id"], redirect_uri, frontend_origin
    )

    sig = inspect.signature(get_calendar_auth_url)
    if "redirect_uri" in sig.parameters:
        auth_url = await get_calendar_auth_url(state=state, redirect_uri=eff_redirect)
    else:
        auth_url = await get_calendar_auth_url(state=state)

    return {
        "auth_url": auth_url,
        "state": state,
        "redirect_uri": eff_redirect,
    }


# ── GET /calendar/callback ────────────────────────────────────────────────────
@router.get("/callback")
@router.get("/callback/")
async def calendar_callback(
    request: Request,
    code: str | None = None,
    error: str | None = None,
    state: str = "",
):
    """Handle Google OAuth2 callback — exchange code for tokens & redirect to frontend."""
    supabase = get_supabase_admin()
    return await handle_calendar_callback(
        request=request,
        code=code,
        error=error,
        state=state,
        supabase=supabase,
        exchange_fn=exchange_calendar_code,
    )


# ── GET /calendar/status ──────────────────────────────────────────────────────
@router.get("/status")
async def get_calendar_status(user: dict = Depends(get_current_user)):
    """Check if current authenticated user has connected Google Calendar."""
    supabase = get_supabase_admin()
    return get_user_calendar_status(supabase, user)


# ── GET /calendar/events ──────────────────────────────────────────────────────
@router.get("/events")
async def get_upcoming_calendar_events(
    only_meet: bool = True,
    user: dict = Depends(get_current_user),
):
    """Fetch next upcoming calendar events for the connected user (filtered to Google Meet calls)."""
    supabase = get_supabase_admin()
    try:
        res = (
            supabase.table("users")
            .select("calendar_token")
            .eq("id", user["user_id"])
            .execute()
        )
        if not res.data or not res.data[0].get("calendar_token"):
            return {"events": []}
        calendar_token = res.data[0]["calendar_token"]
        events = await list_upcoming_events(
            calendar_token, max_results=25, only_meet=only_meet
        )
        return {"events": events}
    except Exception as e:
        logging.warning(f"Could not fetch upcoming calendar events: {e}")
        return {"events": []}


# ── POST /calendar/test-event ─────────────────────────────────────────────────
@router.post("/test-event")
async def create_calendar_test_event(user: dict = Depends(get_current_user)):
    """Create a 15-minute test event with Google Meet link on user's primary calendar."""
    supabase = get_supabase_admin()
    res = (
        supabase.table("users")
        .select("calendar_token")
        .eq("id", user["user_id"])
        .execute()
    )
    if not res.data or not res.data[0].get("calendar_token"):
        raise HTTPException(status_code=400, detail="Google Calendar is not connected")
    calendar_token = res.data[0]["calendar_token"]
    try:
        created = await create_test_event(calendar_token)
        return {
            "status": "created",
            "event_id": created.get("id"),
            "html_link": created.get("htmlLink"),
            "hangout_link": created.get("hangoutLink") or created.get("location"),
            "summary": created.get("summary"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create test event: {e}")


# ── POST /calendar/preferences ────────────────────────────────────────────────
@router.post("/preferences")
async def update_calendar_preferences(
    body: CalendarPreferencesRequest,
    user: dict = Depends(get_current_user),
):
    """Save user calendar sub-options and automation preferences."""
    supabase = get_supabase_admin()
    return save_user_calendar_preferences(supabase, user["user_id"], body.model_dump())


# ── POST /calendar/disconnect ─────────────────────────────────────────────────
@router.post("/disconnect")
async def disconnect_calendar(user: dict = Depends(get_current_user)):
    """Disconnect Google Calendar by clearing stored token."""
    supabase = get_supabase_admin()
    return disconnect_user_calendar(supabase, user["user_id"])


# ── POST /calendar/webhook ────────────────────────────────────────────────────
@router.post("/webhook")
async def calendar_webhook(request: Request):
    """Receive Google Calendar push notifications."""
    headers = dict(request.headers)
    return {
        "received": True,
        "channel_id": headers.get("x-goog-channel-id", ""),
        "state": headers.get("x-goog-resource-state", ""),
    }


# ── POST /calendar/schedule?meeting_id=... ────────────────────────────────────
@router.post("/schedule")
async def schedule_followup(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """Trigger follow-up scheduling via OAuth token or direct URL template."""
    supabase = get_supabase_admin()
    return await schedule_calendar_followup(supabase, meeting_id, user)
