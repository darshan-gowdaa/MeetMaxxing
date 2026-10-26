"""
Google Calendar synchronization helpers, OAuth client utilities, and diagnostics.
"""

import base64
from datetime import UTC, datetime, timedelta
import json
import logging
import urllib.parse

from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from ..core.config import settings
from ..core.database import get_meeting_record

DEFAULT_CALENDAR_PREFERENCES = {
    "auto_schedule_followups": True,
    "followup_mode": "prompt",  # "prompt" or "auto"
    "lead_days": 3,
    "time_block_actions": True,
    "context_sync": True,
}


class CalendarPreferencesRequest(BaseModel):
    auto_schedule_followups: bool = True
    followup_mode: str = "prompt"
    lead_days: int = Field(default=3, ge=1, le=14)
    time_block_actions: bool = True
    context_sync: bool = True


def build_gcal_url(
    title: str,
    details: str,
    start_dt: datetime | None,
    duration_minutes: int = 60,
    attendees: list[str] | None = None,
) -> str:
    """Build a Google Calendar template URL for 0-OAuth direct event creation."""
    if start_dt is None:
        start_dt = datetime.now(UTC) + timedelta(days=1)
        start_dt = start_dt.replace(hour=10, minute=0, second=0, microsecond=0)

    end_dt = start_dt + timedelta(minutes=duration_minutes)

    def _fmt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%SZ")

    params: dict[str, str] = {
        "action": "TEMPLATE",
        "text": title,
        "details": details[:1500],
        "dates": f"{_fmt(start_dt)}/{_fmt(end_dt)}",
    }
    if attendees:
        params["add"] = ",".join(attendees)

    base = "https://calendar.google.com/calendar/render"
    return f"{base}?{urllib.parse.urlencode(params)}"


def build_event_details(meeting: dict, meeting_id: str) -> tuple[str, str]:
    """Build (title, details) for calendar event from meeting record."""
    follow_up = meeting.get("follow_up") or {}
    if follow_up.get("suggested_topic"):
        title = f"Follow-up: {follow_up['suggested_topic']}"
    else:
        title = f"Follow-up: {meeting.get('title') or 'Meeting'}"

    summary_text = meeting.get("summary") or "No summary available."
    action_items = meeting.get("action_items") or []
    ai_lines = "\n".join(
        f"• {a.get('description', a.get('text', ''))} (Owner: {a.get('owner_name', 'Unassigned')})"
        for a in action_items[:10]
    )
    details = f"Meeting Summary:\n{summary_text}"
    if ai_lines:
        details += f"\n\nAction Items:\n{ai_lines}"
    details += f"\n\nDashboard: {settings.FRONTEND_URL}/meetings/{meeting_id}"
    return title, details


def parse_start_dt(meeting: dict) -> datetime | None:
    """Parse meeting end_at and return next-day 10am UTC as follow-up start."""
    if meeting.get("end_at"):
        try:
            end = datetime.fromisoformat(meeting["end_at"].replace("Z", "+00:00"))
            return (end + timedelta(days=1)).replace(
                hour=10, minute=0, second=0, microsecond=0
            )
        except Exception:
            pass
    return None


def resolve_redirect_uri(
    request: Request, client_redirect_uri: str | None = None
) -> str:
    """Determine the appropriate redirect URI for Google OAuth."""
    allowed_hosts = {
        "meetmaxxing-api.onrender.com",
        "localhost",
        "localhost:8000",
        "127.0.0.1",
        "127.0.0.1:8000",
    }
    if client_redirect_uri:
        parsed = urllib.parse.urlparse(client_redirect_uri)
        if parsed.netloc in allowed_hosts and parsed.path in {
            "/calendar/callback",
            "/api/calendar/callback",
        }:
            return client_redirect_uri

    proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
    )

    if any(h in host for h in ("localhost", "127.0.0.1")):
        return f"http://{host}/calendar/callback"

    if "onrender.com" in host:
        return f"https://{host}/calendar/callback"

    return (
        settings.GOOGLE_REDIRECT_URI
        or "https://meetmaxxing-api.onrender.com/calendar/callback"
    )


def decode_state(state: str) -> dict:
    """Parse OAuth state parameter into a dict with user_id, redirect_uri, and frontend_origin."""
    if not state:
        return {}
    try:
        padded = state + "=" * (-len(state) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode()).decode("utf-8")
        try:
            payload = json.loads(decoded)
            if isinstance(payload, dict):
                return payload
        except Exception:
            pass
        if decoded:
            return {"user_id": decoded}
    except Exception:
        pass
    return {"user_id": state}


def get_oauth_diagnostics(request: Request) -> dict:
    """Return diagnostic info for Google Calendar OAuth configuration."""
    active_redirect = resolve_redirect_uri(request)
    cid = settings.GOOGLE_CLIENT_ID or ""
    client_id_preview = (
        f"{cid[:10]}...{cid[-14:]}" if len(cid) > 24 else (cid or "not_configured")
    )

    return {
        "status": (
            "configured"
            if bool(cid and settings.GOOGLE_CLIENT_SECRET)
            else "incomplete"
        ),
        "client_id_preview": client_id_preview,
        "active_redirect_uri": active_redirect,
        "configured_redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "required_authorized_redirect_uris": [
            "https://meetmaxxing-api.onrender.com/calendar/callback",
            "https://meetmaxxing-api.onrender.com/api/calendar/callback",
            "http://localhost:8000/calendar/callback",
            "http://localhost:8000/api/calendar/callback",
        ],
        "google_cloud_console_url": "https://console.cloud.google.com/apis/credentials",
    }


def prepare_calendar_auth(
    request: Request,
    user_id: str,
    redirect_uri: str | None = None,
    frontend_origin: str | None = None,
) -> tuple[str, str]:
    """Prepare state payload and effective redirect uri for Google OAuth."""
    effective_redirect_uri = resolve_redirect_uri(request, redirect_uri)
    effective_frontend = (
        frontend_origin
        or request.headers.get("origin")
        or request.headers.get("referer")
        or settings.FRONTEND_URL
        or "https://meetmaxxing.vercel.app"
    )
    parsed_frontend = urllib.parse.urlparse(effective_frontend)
    if parsed_frontend.scheme and parsed_frontend.netloc:
        effective_frontend = f"{parsed_frontend.scheme}://{parsed_frontend.netloc}"

    state_payload = json.dumps(
        {
            "user_id": user_id,
            "redirect_uri": effective_redirect_uri,
            "frontend_origin": effective_frontend,
        }
    )
    state = base64.urlsafe_b64encode(state_payload.encode()).decode()
    return state, effective_redirect_uri


async def handle_calendar_callback(
    request: Request,
    code: str | None,
    error: str | None,
    state: str,
    supabase,
    exchange_fn,
) -> RedirectResponse | dict:
    """Exchange code for OAuth tokens, persist credentials, and redirect browser."""
    state_data = decode_state(state)
    user_id = state_data.get("user_id")
    stored_redirect = state_data.get("redirect_uri") or resolve_redirect_uri(request)
    frontend_origin = (
        state_data.get("frontend_origin")
        or settings.FRONTEND_URL
        or "https://meetmaxxing.vercel.app"
    ).rstrip("/")

    accept = request.headers.get("accept", "")
    is_browser = "text/html" in accept

    if error:
        logging.warning(f"Google OAuth callback returned error: {error}")
        if is_browser:
            return RedirectResponse(
                url=f"{frontend_origin}/settings/integrations/google-calendar?calendar_error={urllib.parse.quote(error)}",
                status_code=302,
            )
        raise HTTPException(status_code=400, detail=f"Google OAuth error: {error}")

    if not code:
        if is_browser:
            return RedirectResponse(
                url=f"{frontend_origin}/settings/integrations/google-calendar?calendar_error=missing_code",
                status_code=302,
            )
        raise HTTPException(status_code=400, detail="Missing authorization code")

    try:
        import inspect

        sig = inspect.signature(exchange_fn)
        kwargs = {}
        if "redirect_uri" in sig.parameters:
            kwargs["redirect_uri"] = stored_redirect
        if "code_verifier" in sig.parameters and state_data.get("code_verifier"):
            kwargs["code_verifier"] = state_data["code_verifier"]
        tokens = await exchange_fn(code, **kwargs)
    except Exception as e:
        logging.error(f"Failed to exchange calendar code: {e}")
        if is_browser:
            return RedirectResponse(
                url=f"{frontend_origin}/settings/integrations/google-calendar?calendar_error={urllib.parse.quote(str(e))}",
                status_code=302,
            )
        raise HTTPException(
            status_code=400,
            detail=f"Calendar auth failed. Please try again or check your credentials: {e}",
        )

    if user_id:
        try:
            tokens_to_store = dict(tokens)
            tokens_to_store.setdefault("last_synced_at", datetime.now(UTC).isoformat())
            supabase.table("users").update({"calendar_token": tokens_to_store}).eq(
                "id", user_id
            ).execute()
        except Exception as e:
            logging.error(f"Failed to persist calendar_token for user {user_id}: {e}")

    if is_browser:
        return RedirectResponse(
            url=f"{frontend_origin}/settings/integrations/google-calendar?calendar=connected",
            status_code=302,
        )

    return {
        "status": "connected",
        "message": "Google Calendar connected successfully",
        "token_preview": {"has_refresh": bool(tokens.get("refresh_token"))},
    }


def get_user_calendar_status(supabase, user: dict) -> dict:
    """Check if current user has connected Google Calendar and return status."""
    calendar_token = None
    user_email = user.get("email")
    try:
        res = (
            supabase.table("users")
            .select("calendar_token, email")
            .eq("id", user["user_id"])
            .execute()
        )
        if res.data:
            calendar_token = res.data[0].get("calendar_token")
            if not user_email:
                user_email = res.data[0].get("email")
    except Exception as e:
        logging.warning(
            f"Error checking calendar status for {user.get('user_id')}: {e}"
        )

    is_connected = bool(
        calendar_token
        and isinstance(calendar_token, dict)
        and len(calendar_token) > 0
        and (calendar_token.get("access_token") or calendar_token.get("refresh_token"))
    )

    if not is_connected:
        return {
            "connected": False,
            "email": None,
            "last_synced_at": None,
            "preferences": DEFAULT_CALENDAR_PREFERENCES,
        }

    token_email = calendar_token.get("email") or user_email
    last_synced = calendar_token.get("last_synced_at") or calendar_token.get(
        "synced_at"
    )
    raw_prefs = calendar_token.get("preferences")
    preferences = (
        dict(DEFAULT_CALENDAR_PREFERENCES, **raw_prefs)
        if isinstance(raw_prefs, dict)
        else DEFAULT_CALENDAR_PREFERENCES
    )

    return {
        "connected": True,
        "email": token_email,
        "last_synced_at": last_synced,
        "preferences": preferences,
    }


def build_add_url_response(supabase, meeting_id: str, org_id: str) -> dict:
    """Generate calendar Add Event URL from meeting details and update record."""
    m = get_meeting_record(supabase, meeting_id, org_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    title, details = build_event_details(m, meeting_id)
    start_dt = parse_start_dt(m)

    gcal_url = build_gcal_url(
        title=title,
        details=details,
        start_dt=start_dt,
        attendees=m.get("attendees") or [],
    )

    try:
        supabase.table("meetings").update(
            {
                "scheduling_result": {
                    "status": "gcal_url_generated",
                    "html_link": gcal_url,
                }
            }
        ).eq("id", meeting_id).execute()
    except Exception as e:
        logging.warning(
            f"Could not persist scheduling_result (column may be missing): {e}"
        )

    return {
        "gcal_url": gcal_url,
        "html_link": gcal_url,
        "status": "gcal_url_generated",
    }


def save_user_calendar_preferences(supabase, user_id: str, preferences: dict) -> dict:
    """Save user calendar sub-options and automation preferences."""
    res = supabase.table("users").select("calendar_token").eq("id", user_id).execute()
    if not res.data or not res.data[0].get("calendar_token"):
        raise HTTPException(status_code=400, detail="Google Calendar is not connected")
    token_dict = dict(res.data[0]["calendar_token"])
    token_dict["preferences"] = preferences
    supabase.table("users").update({"calendar_token": token_dict}).eq(
        "id", user_id
    ).execute()
    return {"status": "updated", "preferences": preferences}


def disconnect_user_calendar(supabase, user_id: str) -> dict:
    """Disconnect Google Calendar by clearing stored token."""
    try:
        supabase.table("users").update({"calendar_token": None}).eq(
            "id", user_id
        ).execute()
    except Exception as e:
        logging.error(f"Error disconnecting calendar for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect calendar")
    return {"success": True}


async def schedule_calendar_followup(supabase, meeting_id: str, user: dict) -> dict:
    """Trigger follow-up scheduling with OAuth token or fallback to direct link."""
    meeting = get_meeting_record(supabase, meeting_id, user["org_id"])
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    calendar_token = None
    try:
        user_result = (
            supabase.table("users")
            .select("calendar_token")
            .eq("id", user["user_id"])
            .single()
            .execute()
        )
        if user_result.data:
            calendar_token = user_result.data.get("calendar_token")
    except Exception:
        pass

    if calendar_token and calendar_token.get("access_token"):
        try:
            from ..agents.scheduler_agent import run_scheduler_agent

            schedule_result = await run_scheduler_agent(
                summary_output={
                    "summary": meeting.get("summary", ""),
                    "decisions": meeting.get("decisions", []),
                    "action_items": meeting.get("action_items", []),
                    "follow_up": meeting.get(
                        "follow_up", {"required": True, "suggested_topic": "Follow-up"}
                    ),
                },
                attendee_emails=meeting.get("attendees", []),
                calendar_token=calendar_token,
                org_id=user["org_id"],
            )
            return schedule_result
        except Exception:
            pass  # Fall through to gcal_url fallback

    title, details = build_event_details(meeting, meeting_id)
    start_dt = parse_start_dt(meeting)

    gcal_url = build_gcal_url(
        title=title,
        details=details,
        start_dt=start_dt,
        attendees=meeting.get("attendees") or [],
    )

    try:
        supabase.table("meetings").update(
            {
                "scheduling_result": {
                    "status": "gcal_url_generated",
                    "html_link": gcal_url,
                }
            }
        ).eq("id", meeting_id).execute()
    except Exception as e:
        logging.warning(
            f"Could not persist scheduling_result (column may be missing): {e}"
        )

    return {
        "status": "gcal_url_generated",
        "html_link": gcal_url,
        "gcal_url": gcal_url,
        "message": "No Google Calendar OAuth token. Click the link to add this event to your Google Calendar.",
    }
