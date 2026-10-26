"""
Meeting management endpoints — end meeting, trigger post-processing pipeline.
"""

import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from ..core.auth import get_current_user
from ..core.database import get_meeting_record, get_supabase_admin
from ..services.meeting_pipeline import run_end_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meeting", tags=["meeting"])


class EndMeetingRequest(BaseModel):
    title: str = ""
    attendees: list[str] = []
    max_participants: int = 1
    calendar_token: dict | None = None  # user's Google OAuth token for scheduling


class ScheduleFollowupRequest(BaseModel):
    start_datetime_iso: str
    duration_minutes: int
    title: str
    description: str
    attendees: list[str]


@router.post("/{meeting_id}/end")
async def end_meeting(
    meeting_id: str,
    req: EndMeetingRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Trigger meeting-end pipeline:
    1. Fetch full transcript from Redis
    2. Persist transcript to Supabase
    3. Run Summary Agent (async background)
    4. Lyzr guardrail validation
    5. Persist summary + memory to Qdrant
    6. Run Scheduler Agent if follow-up needed
    """
    # Immediately mark as processing so UI shows correct state
    try:
        supabase = get_supabase_admin()
        rec = get_meeting_record(supabase, meeting_id, user["org_id"])
        if rec and rec.get("id"):
            supabase.table("meetings").update({"status": "processing"}).eq(
                "id", rec["id"]
            ).execute()
    except Exception:
        pass

    background_tasks.add_task(
        _run_end_pipeline,
        meeting_id=meeting_id,
        title=req.title,
        attendees=req.attendees,
        max_participants=req.max_participants,
        calendar_token=req.calendar_token,
        org_id=user["org_id"],
        user_id=user["user_id"],
    )
    return {"status": "processing", "meeting_id": meeting_id}


@router.post("/{meeting_id}/reprocess")
async def reprocess_meeting(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Re-trigger the summary pipeline for a stuck/failed meeting."""
    supabase = get_supabase_admin()
    rec = get_meeting_record(supabase, meeting_id, user["org_id"])
    if not rec:
        raise HTTPException(status_code=404, detail="Meeting not found")

    target_id = rec.get("id") or meeting_id
    supabase.table("meetings").update({"status": "processing"}).eq(
        "id", target_id
    ).execute()

    background_tasks.add_task(
        _run_end_pipeline,
        meeting_id=target_id,
        title=rec.get("title", ""),
        attendees=rec.get("attendees") or [],
        max_participants=len(rec.get("attendees") or []) or 1,
        calendar_token=None,
        org_id=user["org_id"],
        user_id=user["user_id"],
    )
    return {"status": "reprocessing", "meeting_id": target_id}


@router.post("/{meeting_id}/schedule_followup")
async def schedule_followup(
    meeting_id: str,
    req: ScheduleFollowupRequest,
    user: dict = Depends(get_current_user),
):
    """Explicitly schedule a follow-up meeting using user's calendar token."""
    supabase = get_supabase_admin()
    user_res = (
        supabase.table("users")
        .select("calendar_token")
        .eq("id", user["user_id"])
        .single()
        .execute()
    )
    if not user_res.data or not user_res.data.get("calendar_token"):
        raise HTTPException(
            status_code=400, detail="No Google Calendar OAuth token provided."
        )

    calendar_token = user_res.data.get("calendar_token")

    try:
        event_start = datetime.fromisoformat(
            req.start_datetime_iso.replace("Z", "+00:00")
        )
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid ISO format for start_datetime_iso."
        )

    event_end = event_start + timedelta(minutes=req.duration_minutes)

    # Normalize to UTC and emit a clean RFC3339 "Z" timestamp. Using
    # `isoformat() + "Z"` on an aware datetime previously produced an invalid
    # double-offset value like "2026-01-01T10:00:00+00:00Z".
    start_utc = event_start if event_start.tzinfo else event_start.replace(tzinfo=UTC)
    end_utc = event_end if event_end.tzinfo else event_end.replace(tzinfo=UTC)
    start_ts = start_utc.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_ts = end_utc.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    calendar_payload = {
        "summary": req.title,
        "description": req.description,
        "start": {"dateTime": start_ts, "timeZone": "UTC"},
        "end": {"dateTime": end_ts, "timeZone": "UTC"},
        "attendees": [{"email": e} for e in req.attendees if "@" in e],
    }

    from ..services.calendar_service import create_calendar_event

    try:
        result = await create_calendar_event(calendar_payload, calendar_token)
    except Exception as e:
        logger.error(f"Failed to create explicit calendar event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    schedule_result = {
        "scheduled": True,
        "event_id": result.get("id"),
        "event_link": result.get("htmlLink"),
        "event_summary": req.title,
        "start_time": event_start.isoformat(),
        "attendees": req.attendees,
    }

    supabase.table("meetings").update({"scheduling_result": schedule_result}).eq(
        "id", meeting_id
    ).execute()

    return {"status": "success", "scheduling_result": schedule_result}


@router.post("/{meeting_id}/refine_transcript")
async def refine_transcript(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """Refine the transcript using AI."""
    supabase = get_supabase_admin()
    meeting = get_meeting_record(supabase, meeting_id, user["org_id"])
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    target_id = meeting.get("id") or meeting_id
    transcript_data = meeting.get("transcript_data") or []

    if not transcript_data:
        raise HTTPException(status_code=400, detail="No transcript data found")

    try:
        from ..core.llm_fallback import generate_content_with_fallback

        raw_text = "\n".join(
            [
                f"[{t.get('timestamp_ms', 0)}ms] {t.get('speaker', 'Unknown')}: {t.get('text', '')}"
                for t in transcript_data
            ]
        )

        prompt = f"""You are an expert transcription editor. Review the following raw meeting transcript.
Your task is to produce a CLEARED, REFINED, and HIGHLY READABLE transcript. 
CRITICAL RULES:
1. MERGE duplicate or stuttered sentences completely.
2. REMOVE ALL filler words (e.g., um, uh, like, you know, sort of).
3. COMBINE consecutive utterances by the same speaker into a single fluent paragraph where appropriate.
4. FIX grammar, correct obvious diarization (speaker) errors, and make it read like a professional script.
5. PRESERVE all original meaning, decisions, and context. Do NOT summarize; just clean it perfectly.

Output ONLY a JSON object with a single key "transcript" containing an array of objects, each containing:
- speaker: The speaker's name
- timestamp_ms: The original timestamp in ms (use the first timestamp of the merged chunk)
- text: The perfectly refined, clean text

Raw transcript:
{raw_text}"""

        import json

        refined_json_str, _ = await generate_content_with_fallback(
            prompt, response_format_json=True, bypass_cache=True, max_tokens=8192
        )

        if not refined_json_str:
            raise ValueError("Failed to get response from AI providers")

        # sometimes LLMs return JSON inside markdown block
        refined_json_str = refined_json_str.strip()
        refined_json_str = refined_json_str.removeprefix("```json")
        refined_json_str = refined_json_str.removeprefix("```")
        refined_json_str = refined_json_str.removesuffix("```")

        refined_data = json.loads(refined_json_str.strip())

        # Ensure format
        if isinstance(refined_data, dict) and "transcript" in refined_data:
            refined_list = refined_data["transcript"]
        elif isinstance(refined_data, list):
            refined_list = refined_data
        else:
            raise ValueError("LLM did not return a valid list or transcript object")

        if isinstance(refined_list, list):
            for item in refined_list:
                item["source"] = "refined"

            # Keep raw transcript chunks so users can toggle between Raw and Refined
            raw_chunks = [t for t in transcript_data if t.get("source") != "refined"]
            for r in raw_chunks:
                if not r.get("source"):
                    r["source"] = "dom"

            combined = raw_chunks + refined_list
            supabase.table("meetings").update({"transcript_data": combined}).eq(
                "id", target_id
            ).execute()
            return {"status": "success", "transcript_data": combined}
        else:
            raise TypeError("LLM did not return a list inside transcript")
    except Exception as e:
        logger.error(f"Failed to refine transcript: {e}")
        raise HTTPException(status_code=500, detail="Failed to refine transcript")


# Export alias for backwards compatibility and background task execution
_run_end_pipeline = run_end_pipeline
