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

    # 1. Fetch + persist transcript
    utterances = await get_full_transcript(meeting_id)
    await persist_transcript_to_db(meeting_id, utterances)

    if not utterances:
        supabase.table("meetings").update({"status": "no_transcript"}).eq("id", meeting_id).execute()
        return

    # 2. Run summary agent
    summary = await dispatch(AgentTrigger.MEETING_END, {
        "meeting_id": meeting_id,
        "title": title,
        "attendees": attendees
    })

    # 3. Lyzr guardrail validation
    raw_transcript = summary.pop("raw_transcript", "")
    guardrail_result = await validate_summary_output(summary, raw_transcript)
    final_summary = guardrail_result.cleaned_output

    # 4. Persist summary to Supabase
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date().isoformat()

    supabase.table("meetings").update(
        {
            "title": title or "Untitled Meeting",
            "summary": final_summary.get("summary") or final_summary.get("executive_summary") or final_summary.get("recap") or "",
            "decisions": final_summary.get("decisions", []),
            "action_items": final_summary.get("action_items", []),
            "follow_up": final_summary.get("follow_up", {}),
            "guardrail_score": guardrail_result.score,
            "status": "completed",
        }
    ).eq("id", meeting_id).execute()

    # 5. Persist action items to dedicated table
    for ai in final_summary.get("action_items", []):
        supabase.table("action_items").insert(
            {
                "id": str(uuid.uuid4()),
                "meeting_id": meeting_id,
                "org_id": org_id,
                "description": ai.get("text", ""),
                "owner_name": ai.get("owner", "Unassigned"),
                "priority": ai.get("priority", "medium"),
                "due_date": ai.get("due_date"),
                "status": "open",
            }
        ).execute()

    # 6. Embed + upsert memories to Qdrant
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

    # 7. Auto-schedule follow-up & send Gmail reminder if needed
    if not calendar_token:
        try:
            user_res = supabase.table("users").select("calendar_token").eq("id", user_id).single().execute()
            if user_res.data:
                calendar_token = user_res.data.get("calendar_token")
        except Exception:
            calendar_token = None

    if final_summary.get("follow_up", {}).get("required") or attendees:
        if not calendar_token or not calendar_token.get("access_token") or calendar_token.get("access_token") == "mock_access_token":
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

    # 8. Send Slack and Email notifications
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
    supabase.table("meetings").update(
        {
            "email_result": email_result,
            "slack_result": slack_result
        }
    ).eq("id", meeting_id).execute()
