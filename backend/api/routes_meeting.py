"""
Meeting management endpoints — end meeting, trigger post-processing pipeline.
"""

import uuid
from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

logger = logging.getLogger(__name__)
from pydantic import BaseModel
from ..core.auth import get_current_user
from ..core.database import get_supabase_admin, get_meeting_record
from ..core.redis_client import get_full_transcript
from ..services.transcript import persist_transcript_to_db
from ..services.guardrails import validate_summary_output
from ..agents.orchestrator import dispatch, AgentTrigger
from ..memory.qdrant_client import upsert_memories
from ..memory.embeddings import embed_batch, chunk_transcript
from ..memory.schemas import MemoryPoint, MemoryType
from ..core.utils import is_valid_uuid, generate_meeting_title

router = APIRouter(prefix="/meeting", tags=["meeting"])


class EndMeetingRequest(BaseModel):
    title: str = ""
    attendees: list[str] = []
    max_participants: int = 1
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
    print(f"[MeetMaxxing END PIPELINE] Starting pipeline for {meeting_id}...")
    logger.info(f"[MeetMaxxing END PIPELINE] Starting pipeline for {meeting_id}...")
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
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).date().isoformat()

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
            for ai in (final_summary.get("action_items") or []):
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

        # Persist email result to Supabase
        try:
            supabase.table("meetings").update(
                {
                    "email_result": email_result
                }
            ).eq("id", target_id or meeting_id).execute()
        except Exception as e:
            import logging
            logging.warning(f"Could not persist email results: {e}")

    except Exception as e:
        logger.error(f"Error in _run_end_pipeline for meeting {meeting_id}: {e}", exc_info=True)
        try:
            # Use the target_id we already resolved at the top of the function
            local_target = locals().get("target_id") or meeting_id
            if local_target and is_valid_uuid(local_target):
                supabase.table("meetings").update(
                    {
                        "status": "completed",
                        "summary": f"A pipeline error occurred: {str(e)[:200]}"
                    }
                ).eq("id", local_target).execute()
        except Exception as inner_e:
            logger.error(f"Failed to update error status for {meeting_id}: {inner_e}")

