"""
Scheduler Agent — auto-schedules follow-up meetings after meeting-end processing.

Trigger: After Summary Agent completes (if follow_up.required == True)
Input:   Summary agent output + meeting attendees + user calendar token
Flow:    Extract intent → suggest datetime → build Calendar payload → create event
Output:  Google Calendar event URL + event details
Governed by Lyzr structured flow — confirms payload before API call
"""

import json
from datetime import datetime, timedelta
import logging

from ..core.config import settings
from ..services.calendar_service import create_calendar_event
from ..core.lyzr_integration import run_lyzr_agent

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
  "reminder_minutes_before": [10, 1440]
}"""

def _parse_json_clean(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    try:
        return json.loads(cleaned)
    except:
        return {}


async def run_scheduler_agent(
    summary_output: dict,
    attendee_emails: list[str],
    calendar_token: dict,
    org_id: str,
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

    prompt = f"""Current meeting summary: {meeting_summary}

Follow-up topic: {suggested_topic}
Attendees to include: {', '.join(suggested_attendees or attendee_emails)}
Open action items from this meeting:
{action_items_text}

Today's date (UTC): {datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}

Determine optimal follow-up meeting details.
CRITICAL: Respond ONLY in valid JSON format matching this schema exactly:
{{
  "title": "Follow-up: [topic]",
  "description": "Clear, professional calendar event description",
  "duration_minutes": 30,
  "start_datetime_iso": "YYYY-MM-DDTHH:MM:SSZ",
  "attendees": ["email1@example.com"],
  "reminder_minutes_before": [10, 1440]
}}
Choose a reasonable business hour (e.g. 10:00 AM or 2:00 PM) for the `start_datetime_iso`, usually 3-5 days from today unless a specific date is mentioned."""

    if settings.GEMINI_API_KEY in ["your-gemini-api-key", "mock-key", ""] or not settings.GEMINI_API_KEY:
        return {"scheduled": False, "reason": "GEMINI_API_KEY not configured in .env."}
    else:
        try:
            raw, powered_by = await run_lyzr_agent("Scheduler Agent - MeetMaxxing", prompt)
            event_plan = _parse_json_clean(raw or "{}")
        except Exception as e:
            err_str = str(e)
            return {"scheduled": False, "reason": f"Fallback API error during scheduling: {err_str[:150]}"}

    # Calculate event datetime
    iso_start = event_plan.get("start_datetime_iso")
    if iso_start:
        try:
            event_start = datetime.fromisoformat(iso_start.replace("Z", "+00:00"))
        except:
            event_start = datetime.utcnow() + timedelta(days=5)
            event_start = event_start.replace(hour=10, minute=0, second=0, microsecond=0)
    else:
        offset_days = event_plan.get("suggested_date_offset_days", 5)
        event_start = datetime.utcnow() + timedelta(days=offset_days)
        event_start = event_start.replace(hour=10, minute=0, second=0, microsecond=0)
        
    event_end = event_start + timedelta(minutes=event_plan.get("duration_minutes", 30))

    final_attendees = list(set(
        event_plan.get("attendees", []) + (suggested_attendees or attendee_emails)
    ))

    calendar_payload = {
        "summary": event_plan.get("title", f"Follow-up: {suggested_topic}"),
        "description": event_plan.get("description", meeting_summary[:500]),
        "start": {"dateTime": event_start.isoformat() + "Z", "timeZone": "UTC"},
        "end": {"dateTime": event_end.isoformat() + "Z", "timeZone": "UTC"},
        "attendees": [{"email": e} for e in final_attendees if "@" in e],
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": m}
                for m in event_plan.get("reminder_minutes_before", [10, 1440])
            ],
        },
    }

    # Create the actual calendar event
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
            "gmail_reminder_sent": True,
            "powered_by": powered_by
        }
    except Exception as e:
        logger.error(f"[Scheduler Agent] Failed to create calendar event: {e}")
        return {"scheduled": False, "reason": f"Calendar API error: {str(e)}"}
