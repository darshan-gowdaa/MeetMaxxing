"""
Dashboard endpoints — meeting list, summaries, action items.
"""

from fastapi import APIRouter, Depends, Query
from ..core.auth import get_current_user
from ..core.database import get_supabase_admin, get_meeting_record

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
        .select("id, title, start_at, end_at, summary, status, attendees, guardrail_score", count="exact")
        .eq("org_id", user["org_id"])
        .order("start_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    action_items_res = (
        supabase.table("action_items")
        .select("id", count="exact")
        .eq("org_id", user["org_id"])
        .execute()
    )
    total_actions = action_items_res.count if hasattr(action_items_res, 'count') and action_items_res.count is not None else len(action_items_res.data or [])
    total_meetings = result.count if hasattr(result, 'count') and result.count is not None else len(result.data or [])
    total_memories = total_meetings * 18 + total_actions * 4

    return {
        "meetings": result.data or [],
        "total": total_meetings,
        "total_action_items": total_actions,
        "total_memory_points": total_memories,
    }


@router.get("/meetings/{meeting_id}")
async def get_meeting_detail(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    """Full meeting detail including transcript, decisions, action items."""
    from fastapi import HTTPException
    
    supabase = get_supabase_admin()
    meeting = get_meeting_record(supabase, meeting_id, user["org_id"])

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    actions = (
        supabase.table("action_items")
        .select("*")
        .eq("meeting_id", meeting_id)
        .order("priority", desc=True)
        .execute()
    )

    return {
        **meeting,
        "action_items": actions.data or [],
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
    """Update action item status (open → in_progress → done)."""
    supabase = get_supabase_admin()
    allowed = {"status", "due_date", "owner_name"}
    safe_updates = {k: v for k, v in updates.items() if k in allowed}
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
    # Delete associated action items first (if no cascade in DB)
    supabase.table("action_items").delete().eq("meeting_id", meeting_id).eq("org_id", user["org_id"]).execute()
    # Delete meeting
    result = supabase.table("meetings").delete().eq("id", meeting_id).eq("org_id", user["org_id"]).execute()
    
    # Delete associated memories from Qdrant
    try:
        from ..memory.qdrant_client import delete_meeting_memories
        await delete_meeting_memories(meeting_id, user["org_id"])
    except Exception as e:
        import logging
        logging.warning(f"Could not delete memories from Qdrant: {e}")

    return {"status": "deleted"}

