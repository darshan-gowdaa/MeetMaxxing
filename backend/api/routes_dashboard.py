"""
Dashboard endpoints — meeting list, summaries, action items.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from ..core.auth import get_current_user
from ..core.database import get_meeting_record, get_supabase_admin
from ..memory.qdrant_client import delete_meeting_memories
from ..core.utils import parse_json_clean

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/meetings")
async def list_meetings(
    limit: int = Query(1000, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    """List meetings for the authenticated user's org, newest first."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("meetings")
        .select(
            "id, title, start_at, end_at, summary, status, attendees, guardrail_score",
            count="exact",
        )
        .eq("org_id", user["org_id"])
        .order("start_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    total_meetings = len(result.data or [])

    return {
        "meetings": result.data or [],
        "total": total_meetings,
    }


@router.get("/meetings/{meeting_id}")
async def get_meeting_detail(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """Full meeting detail including transcript, decisions, and action items."""
    supabase = get_supabase_admin()
    meeting = get_meeting_record(supabase, meeting_id, user["org_id"])

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    target_id = meeting["id"]

    actions = (
        supabase.table("action_items").select("*").eq("meeting_id", target_id).execute()
    )

    # Sort by priority (high → medium → low) then status (open → in_progress → done)
    _priority_order = {"high": 0, "medium": 1, "low": 2}
    _status_order = {"open": 0, "in_progress": 1, "done": 2}
    sorted_actions = sorted(
        actions.data or [],
        key=lambda a: (
            _status_order.get(a.get("status", "open"), 9),
            _priority_order.get((a.get("priority") or "medium").lower(), 9),
        ),
    )

    return {
        **meeting,
        "action_items": sorted_actions,
    }


@router.get("/action-items")
async def list_action_items(
    status: str = Query("open", pattern="^(open|in_progress|done|all)$"),
    user: dict = Depends(get_current_user),
):
    """List all action items across meetings, filterable by status."""
    supabase = get_supabase_admin()
    query = (
        supabase.table("action_items")
        .select("*, meetings(title, start_at)")
        .eq("org_id", user["org_id"])
        .order("created_at", desc=True)
    )
    if status != "all":
        query = query.eq("status", status)
    result = query.execute()
    return {"action_items": result.data or []}


@router.patch("/action-items/{item_id}")
async def update_action_item(
    item_id: str,
    updates: dict,
    user: dict = Depends(get_current_user),
):
    """Update action item fields (status, priority, due_date, owner_name)."""
    supabase = get_supabase_admin()
    allowed = {"status", "due_date", "owner_name", "priority"}
    safe_updates = {k: v for k, v in updates.items() if k in allowed}
    # Normalize priority to lowercase
    if "priority" in safe_updates:
        safe_updates["priority"] = (safe_updates["priority"] or "medium").lower()
    # Validate status transitions
    valid_statuses = {"open", "in_progress", "done"}
    if "status" in safe_updates and safe_updates["status"] not in valid_statuses:
        raise HTTPException(
            status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    if not safe_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    result = (
        supabase.table("action_items")
        .update(safe_updates)
        .eq("id", item_id)
        .eq("org_id", user["org_id"])
        .execute()
    )
    return result.data[0] if result.data else {}


@router.patch("/meetings/{meeting_id}")
async def update_meeting(
    meeting_id: str,
    updates: dict,
    user: dict = Depends(get_current_user),
):
    """Update meeting details (e.g. title)."""
    supabase = get_supabase_admin()
    allowed = {"title", "summary"}
    safe_updates = {k: v for k, v in updates.items() if k in allowed}
    result = (
        supabase.table("meetings")
        .update(safe_updates)
        .eq("id", meeting_id)
        .eq("org_id", user["org_id"])
        .execute()
    )
    return result.data[0] if result.data else {}


@router.delete("/meetings/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a meeting and its associated records."""
    supabase = get_supabase_admin()
    meeting = get_meeting_record(supabase, meeting_id, user["org_id"])
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    target_id = meeting["id"]

    # Delete associated action items first (if no cascade in DB)
    supabase.table("action_items").delete().eq("meeting_id", target_id).eq(
        "org_id", user["org_id"]
    ).execute()
    # Delete meeting
    result = (
        supabase.table("meetings")
        .delete()
        .eq("id", target_id)
        .eq("org_id", user["org_id"])
        .execute()
    )

    # Delete associated memories from Qdrant
    try:
        await delete_meeting_memories(target_id, user["org_id"])
    except Exception as e:
        logging.warning(f"Could not delete memories from Qdrant: {e}")

    return {"status": "deleted"}


@router.post("/meetings/{meeting_id}/suggest-title")
async def suggest_meeting_title(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """Generate intelligent meeting titles from meeting summary and discussion context."""
    supabase = get_supabase_admin()
    meeting = get_meeting_record(supabase, meeting_id, user["org_id"])
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    summary = (meeting.get("summary") or "").strip()
    decisions = meeting.get("decisions") or []
    action_items = meeting.get("action_items") or []
    meet_code = meeting.get("google_meet_link") or ""
    current_title = meeting.get("title") or ""

    decisions_summary = "; ".join(
        [d.get("text") if isinstance(d, dict) else str(d) for d in decisions[:3]]
    )
    actions_summary = "; ".join(
        [
            a.get("description") if isinstance(a, dict) else str(a)
            for a in action_items[:3]
        ]
    )

    system_prompt = (
        "You are an executive meeting assistant. "
        "Generate 3 concise, professional, highly relevant titles (3-6 words each) for this meeting. "
        "Return ONLY raw JSON with keys 'suggested_title' and 'alternatives' (a list of 3 strings)."
    )

    user_prompt = (
        f"Meeting Context:\n"
        f"Current Title: {current_title}\n"
        f"Summary: {summary or 'Brief technical or sync meeting.'}\n"
        f"Key Decisions: {decisions_summary or 'None'}\n"
        f"Action Items: {actions_summary or 'None'}\n\n"
        "Generate 3 professional, engaging title options.\n"
        "Title 1 should be the most descriptive recommended title.\n"
        "Title 2 should focus on outcomes or actions.\n"
        "Title 3 should be concise (2-4 words).\n"
        "Do not include generic words like 'Meeting' or raw codes.\n"
        'Respond in raw JSON: {"suggested_title": "...", "alternatives": ["...", "...", "..."]}'
    )

    suggested_title = ""
    alternatives = []

    try:
        from ..core.llm_fallback import generate_content_with_fallback

        raw_text, _ = await generate_content_with_fallback(
            prompt=user_prompt,
            system_instruction=system_prompt,
            temperature=0.4,
            max_tokens=150,
            response_format_json=True,
            user_id=user.get("user_id") or user.get("id"),
        )
        data = parse_json_clean(raw_text)
        if isinstance(data, dict):
            suggested_title = str(data.get("suggested_title") or "").strip()
            alts = data.get("alternatives")
            if isinstance(alts, list):
                alternatives = [
                    str(a).strip() for a in alts if a and isinstance(a, str)
                ]
    except Exception as e:
        logger.warning(f"[SuggestTitle] LLM fallback error: {e}")

    if not suggested_title:
        if summary:
            first_sent = summary.split(".")[0].strip()
            if len(first_sent) > 50:
                first_sent = first_sent[:47] + "..."
            suggested_title = first_sent
        elif meet_code:
            clean = meet_code.replace("https://meet.google.com/", "").strip("/")
            suggested_title = f"Sync: {clean}"
        else:
            suggested_title = "Team Discussion & Sync"

    if not alternatives:
        alternatives = [suggested_title]
        if summary and suggested_title != "Team Discussion & Sync":
            alternatives.append("Strategic Sync & Action Items")
            alternatives.append("Project Review")
        else:
            alternatives.extend(["Weekly Standup", "Technical Sync"])

    if suggested_title not in alternatives:
        alternatives.insert(0, suggested_title)

    return {
        "suggested_title": suggested_title,
        "alternatives": alternatives[:3],
    }
