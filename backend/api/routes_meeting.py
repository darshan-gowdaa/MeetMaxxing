"""
Meeting management endpoints — end meeting, trigger post-processing pipeline.
"""

import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from ..agents.orchestrator import AgentTrigger, dispatch
from ..core.auth import get_current_user
from ..core.database import get_meeting_record, get_supabase_admin
from ..core.redis_client import get_full_transcript
from ..core.utils import generate_meeting_title, is_valid_uuid
from ..memory.embeddings import chunk_transcript, embed_batch
from ..memory.qdrant_client import upsert_memories
from ..memory.schemas import MemoryPoint, MemoryType
from ..services.guardrails import validate_summary_output
from ..services.transcript import persist_transcript_to_db

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
            supabase.table("meetings").update({"status": "processing"}).eq("id", rec["id"]).execute()
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


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """Fetch meeting record with summary, decisions, and action items."""
    supabase = get_supabase_admin()
    meeting = get_meeting_record(supabase, meeting_id, user["org_id"])
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


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
    supabase.table("meetings").update({"status": "processing"}).eq("id", target_id).execute()

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
    user_res = supabase.table("users").select("calendar_token").eq("id", user["user_id"]).single().execute()
    if not user_res.data or not user_res.data.get("calendar_token"):
        raise HTTPException(status_code=400, detail="No Google Calendar OAuth token provided.")
    
    calendar_token = user_res.data.get("calendar_token")

    try:
        event_start = datetime.fromisoformat(req.start_datetime_iso.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ISO format for start_datetime_iso.")
        
    event_end = event_start + timedelta(minutes=req.duration_minutes)

    calendar_payload = {
        "summary": req.title,
        "description": req.description,
        "start": {"dateTime": event_start.isoformat() + "Z", "timeZone": "UTC"},
        "end": {"dateTime": event_end.isoformat() + "Z", "timeZone": "UTC"},
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

    supabase.table("meetings").update(
        {"scheduling_result": schedule_result}
    ).eq("id", meeting_id).execute()

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
        raw_text = "\n".join([f"[{t.get('timestamp_ms', 0)}ms] {t.get('speaker', 'Unknown')}: {t.get('text', '')}" for t in transcript_data])
        
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
        refined_json_str, _ = await generate_content_with_fallback(prompt, response_format_json=True, bypass_cache=True, max_tokens=8192)
        
        if not refined_json_str:
            raise ValueError("Failed to get response from AI providers")

        # sometimes LLMs return JSON inside markdown block
        refined_json_str = refined_json_str.strip()
        if refined_json_str.startswith("```json"):
            refined_json_str = refined_json_str[7:]
        if refined_json_str.startswith("```"):
            refined_json_str = refined_json_str[3:]
        if refined_json_str.endswith("```"):
            refined_json_str = refined_json_str[:-3]
            
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
            
            # Combine with old or replace
            supabase.table("meetings").update({"transcript_data": refined_list}).eq("id", target_id).execute()
            return {"status": "success", "transcript_data": refined_list}
        else:
            raise ValueError("LLM did not return a list inside transcript")
    except Exception as e:
        logger.error(f"Failed to refine transcript: {e}")
        raise HTTPException(status_code=500, detail="Failed to refine transcript")


async def _run_end_pipeline(
    meeting_id: str,
    title: str,
    attendees: list[str],
    max_participants: int,
    calendar_token: dict | None,
    org_id: str,
    user_id: str,
) -> None:
    """Background task — full post-meeting processing pipeline."""
    logger.info("[MeetMaxxing END PIPELINE] Starting pipeline for {}...", meeting_id)
    supabase = get_supabase_admin()

    try:
        from ..core.database import ensure_meeting_record
        meeting_row = ensure_meeting_record(supabase, meeting_id, org_id, user_id, title)
        target_id = meeting_row.get("id") or meeting_id
        google_code = meeting_row.get("google_meet_link") or (meeting_id if not is_valid_uuid(meeting_id) else None)

        # Mark as processing immediately
        if target_id and is_valid_uuid(target_id):
            try:
                supabase.table("meetings").update({"status": "processing"}).eq("id", target_id).execute()
            except Exception:
                pass

        # get transcript
        utterances = await get_full_transcript(meeting_id)
        if not utterances and google_code:
            utterances = await get_full_transcript(google_code)
        if not utterances and target_id:
            utterances = await get_full_transcript(target_id)
            
        old_utterances = meeting_row.get("transcript_data") if meeting_row and meeting_row.get("transcript_data") else []
        
        if utterances and old_utterances:
            seen_ids = {u.get("id") for u in old_utterances if u.get("id")}
            merged = list(old_utterances)
            for u in utterances:
                if u.get("id") and u.get("id") not in seen_ids:
                    merged.append(u)
                    seen_ids.add(u.get("id"))
            utterances = merged
        elif not utterances and old_utterances:
            utterances = old_utterances

        # Prefer AI cleaned transcripts (source="audio"). Keep DOM transcripts only if no AI chunk exists for that timestamp.
        if utterances:
            ai_times = {u.get("timestamp_ms") for u in utterances if u.get("source") == "audio"}
            utterances = [u for u in utterances if u.get("source") == "audio" or u.get("timestamp_ms") not in ai_times]

        # Persist transcript to DB if target_id exists
        if target_id and utterances:
            await persist_transcript_to_db(target_id, utterances)

        if not utterances:
            logger.warning(f"No utterances found for meeting {meeting_id}, proceeding with empty transcript to ensure summary generation.")
            if target_id:
                supabase.table("meetings").update({"status": "no_transcript"}).eq("id", target_id).execute()
            # DO NOT RETURN, continue pipeline to generate summary


        import re
        if google_code:
            match = re.search(r"([a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3})", google_code.lower())
            if match:
                google_code = match.group(1)

        # Determine title
        final_title = generate_meeting_title(
            title or (meeting_row.get("title") if meeting_row else ""),
            google_code
        )

        # gen summary
        logger.info(f"Dispatching MEETING_END for {meeting_id} with {len(utterances)} utterances")
        summary = await dispatch(AgentTrigger.MEETING_END, {
            "meeting_id": target_id or meeting_id,
            "title": final_title,
            "attendees": attendees,
            "utterances": utterances
        })
        logger.info(f"Dispatch MEETING_END returned for {meeting_id}")

        if summary.get("error"):
            logger.error(f"Failed to generate summary: {summary.get('error')}")
            summary["summary"] = f"Error generating summary: {summary.get('error')}"

        # lyzr checks
        raw_transcript = summary.pop("raw_transcript", "")
        guardrail_result = await validate_summary_output(summary, raw_transcript)
        final_summary = guardrail_result.cleaned_output

        # save to db
        today = datetime.now(UTC).date().isoformat()

        if target_id:
            final_sum_text = final_summary.get("summary") or final_summary.get("executive_summary") or final_summary.get("recap") or ""
            if not final_sum_text and "error" in summary:
                final_sum_text = summary["error"]
            if not final_sum_text:
                final_sum_text = "The meeting was brief with limited context, but it has been successfully logged."
        
            # Force status to completed so the UI always displays the summary
            final_status = "completed"

            # Compute max union of participants
            all_participants = set(attendees or [])
            if meeting_row and meeting_row.get("attendees"):
                all_participants.update(meeting_row.get("attendees"))
            for u in utterances:
                spk = u.get("speaker")
                if spk and spk not in {"Unknown", "System", ""}:
                    all_participants.add(spk)
            final_attendees_list = list(all_participants)
            
            # Pad with dummy participants to match max_participants count
            current_count = len(final_attendees_list)
            if max_participants > current_count:
                for i in range(current_count + 1, max_participants + 1):
                    final_attendees_list.append(f"Participant {i}")
        
            supabase.table("meetings").update(
                {
                    "title": final_title,
                    "summary": final_sum_text,
                    "attendees": final_attendees_list,
                    "decisions": final_summary.get("decisions", []),
                    "follow_up": final_summary.get("follow_up", {}),
                    "guardrail_score": guardrail_result.score,
                    "status": final_status,
                }
            ).eq("id", target_id).execute()

        # save action items
        if target_id:
            _valid_priorities = {"high", "medium", "low"}
            for ai in (final_summary.get("action_items") or []):
                raw_priority = (ai.get("priority") or "medium").strip().lower()
                priority = raw_priority if raw_priority in _valid_priorities else "medium"
                
                raw_due_date = ai.get("due_date")
                due_date = raw_due_date if raw_due_date and re.match(r"^\d{4}-\d{2}-\d{2}$", str(raw_due_date).strip()) else None

                supabase.table("action_items").insert(
                    {
                        "id": str(uuid.uuid4()),
                        "meeting_id": target_id,
                        "org_id": org_id,
                        "description": ai.get("text", ""),
                        "owner_name": ai.get("owner", "Unassigned"),
                        "priority": priority,
                        "due_date": due_date,
                        "status": "open",
                    }
                ).execute()

        # embed for qdrant
        chunks = chunk_transcript(utterances)
        if chunks:
            texts = [c["text"] for c in chunks]
            vectors = await embed_batch(texts)

            memory_points = []
            for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
                memory_points.append(
                    MemoryPoint(
                        id=str(uuid.uuid4()),
                        vector=vec,
                        text=chunk["text"],
                        org_id=org_id,
                        user_id=user_id,
                        meeting_id=meeting_id,
                        memory_type=MemoryType.TRANSCRIPT_CHUNK,
                        meeting_date=today,
                        speaker_name=chunk.get("speaker_name", ""),
                        timestamp_ms=chunk.get("timestamp_ms", 0),
                    )
                )

            # Embed and store decisions
            for dec in (final_summary.get("decisions") or []):
                vec = await embed_batch([dec["text"]])
                memory_points.append(
                    MemoryPoint(
                        id=str(uuid.uuid4()),
                        vector=vec[0],
                        text=dec["text"],
                        org_id=org_id,
                        user_id=user_id,
                        meeting_id=meeting_id,
                        memory_type=MemoryType.DECISION,
                        meeting_date=today,
                        speaker_name=dec.get("decided_by", ""),
                        priority=2 if dec.get("confidence") == "high" else 1,
                    )
                )

            await upsert_memories(memory_points)

        # schedule follow-up and send gmail reminder if needed
        if not calendar_token:
            try:
                user_res = supabase.table("users").select("calendar_token").eq("id", user_id).single().execute()
                if user_res.data:
                    calendar_token = user_res.data.get("calendar_token")
            except Exception:
                calendar_token = None

        if final_summary.get("follow_up", {}).get("required") or attendees:
            try:
                if not calendar_token or not calendar_token.get("access_token"):
                    supabase.table("meetings").update(
                        {"scheduling_result": {"status": "skipped", "reason": "No Google Calendar OAuth token provided. Connect your Google Calendar in Settings to automatically send invites and follow-up reminders."}}
                    ).eq("id", target_id or meeting_id).execute()
                else:
                    schedule_result = await dispatch(AgentTrigger.SCHEDULE_FOLLOWUP, {
                        "summary": final_summary,
                        "attendees": attendees,
                        "token": calendar_token,
                        "org_id": org_id,
                    })
                    supabase.table("meetings").update(
                        {"scheduling_result": schedule_result}
                    ).eq("id", target_id or meeting_id).execute()
            except Exception as e:
                logger.warning(f"Could not persist scheduling_result: {e}")

        # send notifications
        # Send email to organizer
        email_result = await dispatch(AgentTrigger.SEND_EMAIL, {
            "meeting_id": target_id or meeting_id,
            "meeting_title": title or "Untitled Meeting",
            "attendees": attendees,
            "summary": final_summary.get("summary", ""),
            "action_items": [ai.get("text") for ai in (final_summary.get("action_items") or [])],
            "send_immediately": True,
            "to_email": user_id, 
            "user_id": user_id
        })

        # Log email result (skip saving to DB as column doesn't exist)
        if email_result.get("sent"):
            logger.info("Email sent successfully to user.")
        else:
            logger.warning(f"Email send result: {email_result}")

    except Exception as e:
        logger.error(f"Error in _run_end_pipeline for meeting {meeting_id}: {e}", exc_info=True)
        try:
            # Use the target_id we already resolved at the top of the function
            local_target = locals().get("target_id") or meeting_id
            if local_target and is_valid_uuid(local_target):
                supabase.table("meetings").update(
                    {
                        "status": "completed",
                        "summary": "An error occurred while generating the meeting summary. Please try again later."
                    }
                ).eq("id", local_target).execute()
        except Exception as inner_e:
            logger.error(f"Failed to update error status for {meeting_id}: {inner_e}")

