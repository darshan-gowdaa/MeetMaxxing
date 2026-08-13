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
    res = supabase.table("users").select("theme, notifications").eq("id", user["user_id"]).execute()
    data = res.data[0] if res.data else {}
    notifs = data.get("notifications") or {}
    
    return {
        "theme": data.get("theme") or "system",
        "notifications": {
            "email": notifs.get("email", True),
            "reminders": notifs.get("reminders", True),
            "in_app": notifs.get("in_app", True)
        },
        "language": notifs.get("language", "en"),
        "summary_style": notifs.get("summary_style", "concise")
    }

@router.patch("/")
async def update_settings(updates: dict, user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    
    # Get current to merge JSONB
    curr_res = supabase.table("users").select("notifications").eq("id", user["user_id"]).execute()
    curr_notifs = curr_res.data[0].get("notifications") or {} if curr_res.data else {}
    
    db_updates = {}
    if "theme" in updates:
        db_updates["theme"] = updates["theme"]
        
    if "notifications" in updates or "language" in updates or "summary_style" in updates:
        new_notifs = dict(curr_notifs)
        if "notifications" in updates:
            new_notifs.update(updates["notifications"])
        if "language" in updates:
            new_notifs["language"] = updates["language"]
        if "summary_style" in updates:
            new_notifs["summary_style"] = updates["summary_style"]
        db_updates["notifications"] = new_notifs

    if not db_updates:
        raise HTTPException(400, "No valid fields")
        
    res = supabase.table("users").update(db_updates).eq("id", user["user_id"]).execute()
    return res.data[0] if res.data else {}


