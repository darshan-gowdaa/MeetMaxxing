"""
Scheduler Agent — auto-schedules follow-up meetings after meeting-end processing.

Trigger: After Summary Agent completes (if follow_up.required == True)
Input:   Summary agent output + meeting attendees + user calendar token
Flow:    Extract intent → suggest datetime → build Calendar payload → create event
Output:  Google Calendar event URL + event details
"""

import json
import logging
from datetime import UTC, datetime, timedelta

from ..core.config import settings
from ..core.lyzr_integration import run_lyzr_agent
from ..core.utils import parse_json_clean
from ..services.calendar_service import create_calendar_event

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are MeetMaxxing's Scheduler Agent. Given a meeting summary and follow-up intent,
determine the optimal next meeting details.

Rules:
- Suggest a date 3-7 business days from today unless the transcript mentions a specific date.
- Default duration: 30 minutes for check-ins, 60 minutes for reviews.
- Include all attendees from the current meeting unless specifically excluded.
- Write a clear, professional calendar event description summarizing what needs to be discussed.

Respond ONLY in JSON:
{
  "title": "Follow-up: [topic]",
  "description": "...",
  "duration_minutes": 30,
  "suggested_date_offset_days": 5,
  "attendees": ["email1@example.com"],
  "reminder_minutes_before": [10, 1440],
  "has_explicit_date_time": false
}"""


async def run_scheduler_agent(
    summary_output: dict,
    attendee_emails: list[str],
    calendar_token: dict,
    org_id: str,
    user_id: str = "",
) -> dict:
    """
    Given summary agent output, schedule a follow-up calendar event.
    calendar_token: Google OAuth2 token dict for the meeting organizer.
    """
    follow_up = summary_output.get("follow_up", {})

    if not follow_up.get("required", False):
        return {"scheduled": False, "reason": "No follow-up required per summary agent."}

    suggested_topic = follow_up.get("suggested_topic", "Follow-up meeting")
    suggested_attendees = follow_up.get("suggested_attendees", attendee_emails)
    meeting_summary = summary_output.get("summary", "")
    action_items_text = json.dumps(summary_output.get("action_items", []), indent=2)

    today_utc = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    prompt = (
        f"{_SYSTEM_PROMPT}\n\n"
        f"Today is: {today_utc}\n"
        f"Suggested topic: {suggested_topic}\n"
        f"Meeting summary:\n{meeting_summary}\n\n"
        f"Action items:\n{action_items_text}\n\n"
        f"Attendees to include: {', '.join(suggested_attendees or attendee_emails)}\n\n"
        "Determine optimal follow-up meeting details."
    )

    try:
        from ..core.llm_fallback import generate_content_with_fallback
        raw, powered_by = await generate_content_with_fallback(
            prompt,
            response_format_json=True,
            bypass_cache=False,
            max_tokens=600,
            user_id=user_id,
        )
        event_plan = parse_json_clean(raw or "{}")
    except Exception as e:
        return {"scheduled": False, "reason": f"AI error during scheduling: {str(e)[:150]}"}

    # Resolve event start datetime
    iso_start = event_plan.get("start_datetime_iso")
    if iso_start:
        try:
            event_start = datetime.fromisoformat(iso_start.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            event_start = (datetime.now(UTC) + timedelta(days=5)).replace(hour=10, minute=0, second=0, microsecond=0)
    else:
        offset_days = int(event_plan.get("suggested_date_offset_days", 5) or 5)
        event_start = (datetime.now(UTC) + timedelta(days=offset_days)).replace(hour=10, minute=0, second=0, microsecond=0)

    # ensure the meeting falls on a weekday (monday-friday)
    if event_start.weekday() == 5:  # saturday -> monday
        event_start += timedelta(days=2)
    elif event_start.weekday() == 6:  # sunday -> monday
        event_start += timedelta(days=1)

    event_end = event_start + timedelta(minutes=event_plan.get("duration_minutes", 30))
    final_attendees = list(set(event_plan.get("attendees", []) + (suggested_attendees or attendee_emails)))

    calendar_payload = {
        "summary": event_plan.get("title", f"Follow-up: {suggested_topic}"),
        "description": event_plan.get("description", meeting_summary[:500]),
        "start": {"dateTime": event_start.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": event_end.isoformat(), "timeZone": "UTC"},
        "attendees": [{"email": e} for e in final_attendees if "@" in e],
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": m}
                for m in event_plan.get("reminder_minutes_before", [10, 1440])
            ],
        },
    }


    if not event_plan.get("has_explicit_date_time", True):
        return {
            "scheduled": False,
            "needs_user_input": True,
            "suggested_payload": calendar_payload,
            "reason": "No explicit date/time mentioned in meeting.",
        }

    try:
        result = await create_calendar_event(calendar_payload, calendar_token)
        logger.info(f"[Scheduler Agent] Successfully scheduled event using {powered_by}")
        return {
            "scheduled": True,
            "event_id": result.get("id"),
            "event_link": result.get("htmlLink"),
            "event_summary": calendar_payload["summary"],
            "start_time": event_start.isoformat(),
            "attendees": final_attendees,
            "powered_by": powered_by,
        }
    except Exception as e:
        logger.error(f"[Scheduler Agent] Failed to create calendar event: {e}")
        return {"scheduled": False, "reason": f"Calendar API error: {e!s}"}
