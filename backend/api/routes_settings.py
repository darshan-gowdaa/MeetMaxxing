"""
Settings endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from ..core.auth import get_current_user
from ..core.database import get_supabase_admin

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("/")
async def get_settings(user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    res = supabase.table("users").select("theme, notifications").eq("id", user["id"]).execute()
    data = res.data[0] if res.data else {}
    return {
        "theme": data.get("theme") or "system",
        "notifications": data.get("notifications") or {"email": True, "reminders": True, "in_app": True}
    }

@router.patch("/")
async def update_settings(updates: dict, user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    allowed = {"theme", "notifications"}
    safe_updates = {k: v for k, v in updates.items() if k in allowed}
    if not safe_updates:
        raise HTTPException(400, "No valid fields")
    res = supabase.table("users").update(safe_updates).eq("id", user["id"]).execute()
    return res.data[0] if res.data else {}


