"""
Google Calendar OAuth flow + direct-link endpoints.
"""

import urllib.parse
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from ..core.auth import get_current_user
from ..core.database import get_supabase_admin
from ..services.calendar_service import get_calendar_auth_url, exchange_calendar_code
from ..core.config import settings

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
        start_dt = datetime.now(timezone.utc) + timedelta(days=1)
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
            return (end + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
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
    result = (
        supabase.table("meetings")
        .select("title,summary,attendees,action_items,follow_up,start_at,end_at")
        .eq("id", meeting_id)
        .eq("org_id", user["org_id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    m = result.data
    title, details = _build_event_details(m, meeting_id)
    start_dt = _parse_start_dt(m)

    gcal_url = _build_gcal_url(
        title=title,
        details=details,
        start_dt=start_dt,
        attendees=m.get("attendees") or [],
    )

    supabase.table("meetings").update(
        {"scheduling_result": {"status": "gcal_url_generated", "html_link": gcal_url}}
    ).eq("id", meeting_id).execute()

    return {"gcal_url": gcal_url, "html_link": gcal_url, "status": "gcal_url_generated"}


# ── GET /calendar/connect ─────────────────────────────────────────────────────
@router.get("/connect")
async def connect_calendar(user: dict = Depends(get_current_user)):
    """Redirect user to Google OAuth consent for Calendar API access."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=501,
            detail=(
                "Google OAuth not configured. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env, "
                "then register http://localhost:8000/calendar/callback as an Authorized Redirect URI "
                "in Google Cloud Console."
            ),
        )
    auth_url = await get_calendar_auth_url()
    return {"auth_url": auth_url}


# ── GET /calendar/callback ────────────────────────────────────────────────────
@router.get("/callback")
async def calendar_callback(code: str, state: str = ""):
    """Handle Google OAuth2 callback — exchange code for tokens."""
    try:
        tokens = await exchange_calendar_code(code)
        return {
            "status": "connected",
            "message": "Google Calendar connected successfully",
            "token_preview": {"has_refresh": bool(tokens.get("refresh_token"))},
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calendar auth failed: {e}")


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
    result = (
        supabase.table("meetings")
        .select("*")
        .eq("id", meeting_id)
        .eq("org_id", user["org_id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting = result.data

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
                    "follow_up": meeting.get("follow_up", {"required": True, "suggested_topic": "Follow-up"}),
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

    supabase.table("meetings").update(
        {"scheduling_result": {"status": "gcal_url_generated", "html_link": gcal_url}}
    ).eq("id", meeting_id).execute()

    return {
        "status": "gcal_url_generated",
        "html_link": gcal_url,
        "gcal_url": gcal_url,
        "message": "No Google Calendar OAuth token. Click the link to add this event to your Google Calendar.",
    }
