"""
Google Calendar OAuth flow + direct-link endpoints.
"""

import base64
import json
import logging
import urllib.parse
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_meeting_record, get_supabase_admin
from ..services.calendar_service import exchange_calendar_code, get_calendar_auth_url

router = APIRouter(prefix="/calendar", tags=["calendar"])


# ── Helper: build a Google Calendar "add event" URL (no OAuth required) ──────
def _build_gcal_url(
    title: str,
    details: str,
    start_dt: datetime | None,
    duration_minutes: int = 60,
    attendees: list[str] | None = None,
) -> str:
    """
    Returns a calendar.google.com/calendar/render?action=TEMPLATE&... URL.
    Anyone can open this link and click Save — zero OAuth required.
    """
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


def _build_event_details(meeting: dict, meeting_id: str) -> tuple[str, str]:
    """Build (title, details) for a calendar event from a meeting record."""
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


def _parse_start_dt(meeting: dict) -> datetime | None:
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


# ── GET /calendar/add-url?meeting_id=... ─────────────────────────────────────
@router.get("/add-url")
async def get_calendar_add_url(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Return a Google Calendar 'Add Event' template URL built from meeting data.
    No OAuth token required — user clicks the link to add to their own calendar.
    """
    supabase = get_supabase_admin()
    m = get_meeting_record(supabase, meeting_id, user["org_id"])
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    title, details = _build_event_details(m, meeting_id)
    start_dt = _parse_start_dt(m)

    gcal_url = _build_gcal_url(
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

    return {"gcal_url": gcal_url, "html_link": gcal_url, "status": "gcal_url_generated"}


def _decode_state(state: str) -> str | None:
    """Parse user_id from OAuth state parameter (json base64 or raw string)."""
    if not state:
        return None
    try:
        padded = state + "=" * (-len(state) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode()).decode("utf-8")
        try:
            payload = json.loads(decoded)
            if isinstance(payload, dict) and "user_id" in payload:
                return payload["user_id"]
        except Exception:
            pass
        if decoded:
            return decoded
    except Exception:
        pass
    return state


# ── GET /calendar/auth-url & /calendar/connect ────────────────────────────────
@router.get("/auth-url")
@router.get("/connect")
async def connect_calendar(user: dict = Depends(get_current_user)):
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
    state_payload = json.dumps({"user_id": user["user_id"]})
    state = base64.urlsafe_b64encode(state_payload.encode()).decode()
    auth_url = await get_calendar_auth_url(state=state)
    return {"auth_url": auth_url, "state": state}


# ── GET /calendar/callback ────────────────────────────────────────────────────
@router.get("/callback")
async def calendar_callback(code: str, state: str = ""):
    """Handle Google OAuth2 callback — exchange code for tokens."""
    user_id = _decode_state(state)
    try:
        tokens = await exchange_calendar_code(code)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Calendar auth failed. Please try again or check your credentials: {e}",
        )

    if user_id:
        try:
            supabase = get_supabase_admin()
            tokens_to_store = dict(tokens)
            tokens_to_store.setdefault("last_synced_at", datetime.now(UTC).isoformat())
            supabase.table("users").update({"calendar_token": tokens_to_store}).eq(
                "id", user_id
            ).execute()
        except Exception as e:
            logging.error(f"Failed to persist calendar_token for user {user_id}: {e}")

    return {
        "status": "connected",
        "message": "Google Calendar connected successfully",
        "token_preview": {"has_refresh": bool(tokens.get("refresh_token"))},
    }


# ── GET /calendar/status ──────────────────────────────────────────────────────
@router.get("/status")
async def get_calendar_status(user: dict = Depends(get_current_user)):
    """Check if current authenticated user has connected Google Calendar."""
    supabase = get_supabase_admin()
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
        }

    token_email = calendar_token.get("email") or user_email
    last_synced = calendar_token.get("last_synced_at") or calendar_token.get(
        "synced_at"
    )

    return {
        "connected": True,
        "email": token_email,
        "last_synced_at": last_synced,
    }


# ── POST /calendar/disconnect ─────────────────────────────────────────────────
@router.post("/disconnect")
async def disconnect_calendar(user: dict = Depends(get_current_user)):
    """Disconnect Google Calendar by clearing stored token."""
    supabase = get_supabase_admin()
    try:
        supabase.table("users").update({"calendar_token": None}).eq(
            "id", user["user_id"]
        ).execute()
    except Exception as e:
        logging.error(f"Error disconnecting calendar for {user.get('user_id')}: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect calendar")
    return {"success": True}


# ── POST /calendar/webhook ────────────────────────────────────────────────────
@router.post("/webhook")
async def calendar_webhook(request: Request):
    """Receive Google Calendar push notifications."""
    headers = dict(request.headers)
    channel_id = headers.get("x-goog-channel-id", "")
    resource_state = headers.get("x-goog-resource-state", "")
    return {"received": True, "channel_id": channel_id, "state": resource_state}


# ── POST /calendar/schedule?meeting_id=... ────────────────────────────────────
@router.post("/schedule")
async def schedule_followup(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Trigger follow-up scheduling.
    1. Tries stored OAuth token → full Calendar API event creation.
    2. Falls back to a Google Calendar template URL (no OAuth) when token missing.
    """
    supabase = get_supabase_admin()
    meeting = get_meeting_record(supabase, meeting_id, user["org_id"])
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Try stored OAuth token
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

    # ── Fallback: return a Google Calendar template URL (no OAuth needed) ─────
    title, details = _build_event_details(meeting, meeting_id)
    start_dt = _parse_start_dt(meeting)

    gcal_url = _build_gcal_url(
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
