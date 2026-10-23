"""
Settings endpoints.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from ..core.auth import get_current_user
from ..core.database import get_supabase_admin

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _format_settings_response(user_data: dict) -> dict:
    """Helper to return consistent structured settings schema."""
    notifs = user_data.get("notifications") or {}
    if not isinstance(notifs, dict):
        notifs = {}

    sub_notifs = (
        notifs.get("notifications")
        if isinstance(notifs.get("notifications"), dict)
        else notifs
    )

    return {
        "theme": user_data.get("theme") or notifs.get("theme") or "system",
        "compact_view": bool(notifs.get("compact_view", False)),
        "high_contrast": bool(notifs.get("high_contrast", False)),
        "timezone": str(notifs.get("timezone", "UTC")),
        "default_meeting_duration": int(notifs.get("default_meeting_duration", 30)),
        "auto_extract_actions": bool(notifs.get("auto_extract_actions", True)),
        "language": str(notifs.get("language", "en")),
        "summary_style": str(notifs.get("summary_style", "concise")),
        "notifications": {
            "email": bool(sub_notifs.get("email", notifs.get("email", True))),
            "reminders": bool(
                sub_notifs.get("reminders", notifs.get("reminders", True))
            ),
            "in_app": bool(sub_notifs.get("in_app", notifs.get("in_app", True))),
            "prep_lead_time_minutes": int(
                sub_notifs.get(
                    "prep_lead_time_minutes", notifs.get("prep_lead_time_minutes", 15)
                )
            ),
            "action_item_reminders": bool(
                sub_notifs.get(
                    "action_item_reminders", notifs.get("action_item_reminders", True)
                )
            ),
            "digest_time": str(
                sub_notifs.get("digest_time", notifs.get("digest_time", "09:00"))
            ),
        },
        "org_name": str(notifs.get("org_name", user_data.get("org_name", ""))),
    }


@router.get("/")
async def get_settings(user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    data = {}
    try:
        res = (
            supabase.table("users")
            .select("theme, notifications")
            .eq("id", user["user_id"])
            .execute()
        )
        data = res.data[0] if res.data else {}
    except Exception:
        try:
            res = (
                supabase.table("users")
                .select("notifications")
                .eq("id", user["user_id"])
                .execute()
            )
            data = res.data[0] if res.data else {}
        except Exception:
            data = {}

    return _format_settings_response(data)


@router.patch("/")
async def update_settings(updates: dict, user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()

    valid_keys = {
        "theme",
        "compact_view",
        "high_contrast",
        "timezone",
        "default_meeting_duration",
        "auto_extract_actions",
        "language",
        "summary_style",
        "notifications",
        "org_name",
    }
    if not any(k in updates for k in valid_keys):
        raise HTTPException(status_code=400, detail="No valid fields")

    # Get current to merge JSONB
    curr_data = {}
    try:
        curr_res = (
            supabase.table("users")
            .select("theme, notifications")
            .eq("id", user["user_id"])
            .execute()
        )
        curr_data = curr_res.data[0] if curr_res.data else {}
    except Exception:
        try:
            curr_res = (
                supabase.table("users")
                .select("notifications")
                .eq("id", user["user_id"])
                .execute()
            )
            curr_data = curr_res.data[0] if curr_res.data else {}
        except Exception:
            curr_data = {}

    curr_notifs = curr_data.get("notifications") or {}
    if not isinstance(curr_notifs, dict):
        curr_notifs = {}

    new_notifs = dict(curr_notifs)

    # Scalar settings
    for key in [
        "compact_view",
        "high_contrast",
        "timezone",
        "default_meeting_duration",
        "auto_extract_actions",
        "language",
        "summary_style",
        "org_name",
    ]:
        if key in updates:
            new_notifs[key] = updates[key]

    if "theme" in updates:
        new_notifs["theme"] = updates["theme"]

    # Notifications object
    existing_sub_notifs = {}
    if isinstance(new_notifs.get("notifications"), dict):
        existing_sub_notifs.update(new_notifs["notifications"])
    for k in [
        "email",
        "reminders",
        "in_app",
        "prep_lead_time_minutes",
        "action_item_reminders",
        "digest_time",
    ]:
        if k in new_notifs and k not in existing_sub_notifs:
            existing_sub_notifs[k] = new_notifs[k]

    if "notifications" in updates and isinstance(updates["notifications"], dict):
        existing_sub_notifs.update(updates["notifications"])
        new_notifs["notifications"] = existing_sub_notifs
        new_notifs.update(updates["notifications"])
    elif "notifications" not in new_notifs:
        new_notifs["notifications"] = existing_sub_notifs

    db_updates = {"notifications": new_notifs}
    if "theme" in updates:
        db_updates["theme"] = updates["theme"]

    # Store cleanly without throwing errors if extra columns aren't in Supabase
    res = None
    try:
        if curr_data:
            res = (
                supabase.table("users")
                .update(db_updates)
                .eq("id", user["user_id"])
                .execute()
            )
        else:
            db_updates["id"] = user["user_id"]
            res = supabase.table("users").upsert(db_updates).execute()
    except Exception:
        # Fall back to updating only notifications column if theme column doesn't exist
        fallback_updates = {"notifications": new_notifs}
        try:
            if curr_data:
                res = (
                    supabase.table("users")
                    .update(fallback_updates)
                    .eq("id", user["user_id"])
                    .execute()
                )
            else:
                fallback_updates["id"] = user["user_id"]
                res = supabase.table("users").upsert(fallback_updates).execute()
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to update settings: {e}"
            )

    updated_row = res.data[0] if (res and getattr(res, "data", None)) else curr_data
    merged_data = {**updated_row, "notifications": new_notifs}
    if "theme" in updates:
        merged_data["theme"] = updates["theme"]
    return _format_settings_response(merged_data)


@router.post("/export")
async def export_user_data(user: dict = Depends(get_current_user)):
    """GDPR user data export. Gathers profile, settings, meetings, action items, and transcripts."""
    supabase = get_supabase_admin()
    user_id = user["user_id"]
    org_id = user.get("org_id")
    exported_at = datetime.now(UTC).isoformat()

    # 1. Profile
    user_profile = {}
    try:
        user_res = supabase.table("users").select("*").eq("id", user_id).execute()
        if user_res.data:
            user_profile = dict(user_res.data[0])
            if user_profile.get("calendar_token"):
                user_profile["calendar_token"] = "[CONNECTED]"
    except Exception:
        pass
    if not user_profile:
        user_profile = {
            "id": user_id,
            "org_id": org_id,
            "email": user.get("email"),
        }

    # 2. Settings
    settings_data = await get_settings(user)

    # 3. Meetings (including transcript_data, summary, decisions)
    meetings = []
    try:
        m_res = (
            supabase.table("meetings")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        meetings = m_res.data or []
        if not meetings and org_id:
            m_res_org = (
                supabase.table("meetings")
                .select("*")
                .eq("org_id", org_id)
                .order("created_at", desc=True)
                .execute()
            )
            meetings = m_res_org.data or []
    except Exception as e:
        logger.warning(f"[SettingsExport] Failed fetching meetings: {e}")

    # 4. Action items
    action_items = []
    try:
        ai_res = (
            supabase.table("action_items").select("*").eq("owner_id", user_id).execute()
        )
        if ai_res.data:
            action_items.extend(ai_res.data)
    except Exception:
        pass

    meeting_ids = [m["id"] for m in meetings if m.get("id")]
    if meeting_ids:
        try:
            m_ai_res = (
                supabase.table("action_items")
                .select("*")
                .in_("meeting_id", meeting_ids)
                .execute()
            )
            seen_ids = {a.get("id") for a in action_items if a.get("id")}
            for item in m_ai_res.data or []:
                if item.get("id") not in seen_ids:
                    action_items.append(item)
                    seen_ids.add(item.get("id"))
        except Exception:
            pass

    # Fallback to meeting embedded action items if table is empty
    if not action_items:
        for m in meetings:
            m_actions = m.get("action_items")
            if isinstance(m_actions, list):
                for act in m_actions:
                    if isinstance(act, dict):
                        action_items.append({**act, "meeting_id": m.get("id")})

    return {
        "exported_at": exported_at,
        "user": user_profile,
        "settings": settings_data,
        "meetings": meetings,
        "action_items": action_items,
    }
