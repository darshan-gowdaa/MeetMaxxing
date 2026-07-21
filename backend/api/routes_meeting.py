"""
Meeting management endpoints — end meeting, trigger post-processing pipeline.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from ..core.auth import get_current_user
from ..core.database import get_supabase_admin
from ..core.redis_client import get_full_transcript
from ..services.transcript import persist_transcript_to_db
from ..services.guardrails import validate_summary_output
from ..agents.orchestrator import dispatch, AgentTrigger
from ..memory.qdrant_client import upsert_memories
from ..memory.embeddings import embed_batch, chunk_transcript
from ..memory.schemas import MemoryPoint, MemoryType

router = APIRouter(prefix="/meeting", tags=["meeting"])


class EndMeetingRequest(BaseModel):
    title: str = ""
    attendees: list[str] = []
    calendar_token: dict | None = None  # user's Google OAuth token for scheduling


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
    background_tasks.add_task(
        _run_end_pipeline,
        meeting_id=meeting_id,
        title=req.title,
        attendees=req.attendees,
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
    import uuid
    is_uuid = False
    try:
        uuid.UUID(meeting_id)
        is_uuid = True
    except ValueError:
        pass

    supabase = get_supabase_admin()
    query = supabase.table("meetings").select("*")
    if is_uuid:
        query = query.eq("id", meeting_id)
    else:
        query = query.eq("google_meet_link", meeting_id)

    try:
        result = (
            query
            .eq("org_id", user["org_id"])
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return result.data


async def _run_end_pipeline(
    meeting_id: str,
    title: str,
    attendees: list[str],
    calendar_token: dict | None,
    org_id: str,
    user_id: str,
) -> None:
    """Background task — full post-meeting processing pipeline."""
    supabase = get_supabase_admin()

    # Resolve meeting record by ID or google_meet_link
    is_uuid = False
    try:
        uuid.UUID(meeting_id)
        is_uuid = True
    except ValueError:
        pass

    meeting_row = None
    if is_uuid:
        try:
            res = supabase.table("meetings").select("*").eq("id", meeting_id).execute()
            if res.data:
                meeting_row = res.data[0]
        except Exception:
            pass
    else:
        try:
            res = supabase.table("meetings").select("*").like("title", f"%{meeting_id}%").execute()
            if res.data:
                meeting_row = res.data[0]
            else:
                # Fallback to checking google_meet_link just in case schema is intact
                res = supabase.table("meetings").select("*").eq("google_meet_link", meeting_id).execute()
                if res.data:
                    meeting_row = res.data[0]
        except Exception:
            pass

    target_id = meeting_row["id"] if meeting_row else (meeting_id if is_uuid else None)
    google_code = meeting_row.get("google_meet_link") if meeting_row else (meeting_id if not is_uuid else None)

    # get transcript
    utterances = await get_full_transcript(meeting_id)
    if not utterances and google_code:
        utterances = await get_full_transcript(google_code)
    if not utterances and target_id:
        utterances = await get_full_transcript(target_id)
    if not utterances and meeting_row and meeting_row.get("transcript_data"):
        utterances = meeting_row["transcript_data"]

    # Persist transcript to DB if target_id exists
    if target_id and utterances:
        await persist_transcript_to_db(target_id, utterances)

    if not utterances:
        if target_id:
            supabase.table("meetings").update({"status": "no_transcript"}).eq("id", target_id).execute()
        return

    import re
    if google_code:
        match = re.search(r"([a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3})", google_code.lower())
        if match:
            google_code = match.group(1)

    # Determine title
    final_title = title or (meeting_row.get("title") if meeting_row else "")
    if google_code and (not final_title or final_title in ["Google Meet", "Untitled Meeting", "Google Meet Session"]):
        final_title = f"Meet - {google_code}"
    elif google_code and not final_title.startswith("Meet - "):
        final_title = f"Meet - {google_code}"

    if not final_title:
        final_title = "Meet - Live Session"

    # gen summary
    summary = await dispatch(AgentTrigger.MEETING_END, {
        "meeting_id": target_id or meeting_id,
        "title": final_title,
        "attendees": attendees,
        "utterances": utterances
    })

    if summary.get("error"):
        logger.error(f"Failed to generate summary: {summary.get('error')}")
        summary["summary"] = f"Error generating summary: {summary.get('error')}"

    # lyzr checks
    raw_transcript = summary.pop("raw_transcript", "")
    guardrail_result = await validate_summary_output(summary, raw_transcript)
    final_summary = guardrail_result.cleaned_output

    # save to db
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date().isoformat()

    if target_id:
        final_sum_text = final_summary.get("summary") or final_summary.get("executive_summary") or final_summary.get("recap") or ""
        if not final_sum_text and "error" in summary:
            final_sum_text = summary["error"]
        
        # Determine status based on whether it was successful
        final_status = "error" if "error" in summary or not final_summary.get("summary") else "completed"
        
        supabase.table("meetings").update(
            {
                "title": final_title,
                "summary": final_sum_text,
                "decisions": final_summary.get("decisions", []),
                "action_items": final_summary.get("action_items", []),
                "follow_up": final_summary.get("follow_up", {}),
                "guardrail_score": guardrail_result.score,
                "status": final_status,
            }
        ).eq("id", target_id).execute()

    # save action items
    if target_id:
        for ai in final_summary.get("action_items", []):
            supabase.table("action_items").insert(
                {
                    "id": str(uuid.uuid4()),
                    "meeting_id": target_id,
                    "org_id": org_id,
                    "description": ai.get("text", ""),
                    "owner_name": ai.get("owner", "Unassigned"),
                    "priority": ai.get("priority", "medium"),
                    "due_date": ai.get("due_date"),
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
                    memory_type=MemoryType.TRANSCRIPT,
                    meeting_date=today,
                    speaker_name=chunk.get("speaker_name", ""),
                    timestamp_ms=chunk.get("timestamp_ms", 0),
                )
            )

        # Embed and store decisions
        for dec in final_summary.get("decisions", []):
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
        if not calendar_token or not calendar_token.get("access_token"):
            supabase.table("meetings").update(
                {"scheduling_result": {"status": "skipped", "reason": "No Google Calendar OAuth token provided. Connect your Google Calendar in Settings to automatically send invites and follow-up reminders."}}
            ).eq("id", meeting_id).execute()
        else:
            schedule_result = await dispatch(AgentTrigger.SCHEDULE_FOLLOWUP, {
                "summary_output": final_summary,
                "attendee_emails": attendees,
                "calendar_token": calendar_token,
                "org_id": org_id,
            })
            supabase.table("meetings").update(
                {"scheduling_result": schedule_result}
            ).eq("id", meeting_id).execute()

    # send notifications
    slack_result = await dispatch(AgentTrigger.SEND_SLACK, {
        "meeting_title": title or "Untitled Meeting",
        "summary": final_summary.get("summary", ""),
        "action_items": [ai.get("text") for ai in final_summary.get("action_items", [])]
    })
    
    # Send email to organizer
    email_result = await dispatch(AgentTrigger.SEND_EMAIL, {
        "meeting_title": title or "Untitled Meeting",
        "attendees": attendees,
        "summary": final_summary.get("summary", ""),
        "action_items": [ai.get("text") for ai in final_summary.get("action_items", [])],
        "send_immediately": True,
        "to_email": user_id, 
        "user_id": user_id
    })

    # Persist email and slack results to Supabase
    try:
        supabase.table("meetings").update(
            {
                "email_result": email_result,
                "slack_result": slack_result
            }
        ).eq("id", meeting_id).execute()
    except Exception as e:
        import logging
        logging.warning(f"Could not persist email/slack results: {e}")
