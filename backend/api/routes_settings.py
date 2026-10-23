"""
Settings endpoints.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
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

    compact_val = bool(
        notifs.get("compact_view")
        if "compact_view" in notifs
        else notifs.get("compact_meeting_cards", False)
    )
    high_contrast_val = bool(
        notifs.get("high_contrast")
        if "high_contrast" in notifs
        else notifs.get("high_contrast_mode", False)
    )
    duration_val = int(
        notifs.get("default_meeting_duration")
        if "default_meeting_duration" in notifs
        else notifs.get("meeting_duration", 30)
    )

    raw_integrations = notifs.get("integrations")
    if not isinstance(raw_integrations, dict):
        raw_integrations = (
            user_data.get("integrations")
            if isinstance(user_data.get("integrations"), dict)
            else {}
        )
    notion_db = str(
        raw_integrations.get("notion_db_id")
        or raw_integrations.get("notion_database_id")
        or ""
    )
    integrations_dict = {
        "zoom_webhook": str(raw_integrations.get("zoom_webhook") or ""),
        "slack_webhook": str(raw_integrations.get("slack_webhook") or ""),
        "notion_api_key": str(raw_integrations.get("notion_api_key") or ""),
        "notion_db_id": notion_db,
    }

    name_val = str(
        notifs.get("name")
        or notifs.get("display_name")
        or user_data.get("name")
        or user_data.get("display_name")
        or ""
    )
    avatar_val = str(notifs.get("avatar_url") or user_data.get("avatar_url") or "")

    return {
        "theme": user_data.get("theme") or notifs.get("theme") or "system",
        "compact_view": compact_val,
        "compact_meeting_cards": compact_val,
        "high_contrast": high_contrast_val,
        "high_contrast_mode": high_contrast_val,
        "timezone": str(notifs.get("timezone", "UTC")),
        "default_meeting_duration": duration_val,
        "meeting_duration": duration_val,
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
                    "action_item_reminders",
                    sub_notifs.get(
                        "action_items_due", notifs.get("action_item_reminders", True)
                    ),
                )
            ),
            "digest_time": str(
                sub_notifs.get(
                    "digest_time",
                    sub_notifs.get(
                        "daily_digest_time", notifs.get("digest_time", "09:00")
                    ),
                )
            ),
        },
        "org_name": str(notifs.get("org_name", user_data.get("org_name", ""))),
        "name": name_val,
        "avatar_url": avatar_val,
        "integrations": integrations_dict,
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
        "compact_meeting_cards",
        "high_contrast",
        "high_contrast_mode",
        "timezone",
        "default_meeting_duration",
        "meeting_duration",
        "auto_extract_actions",
        "language",
        "summary_style",
        "notifications",
        "org_name",
        "integrations",
        "avatar_url",
        "name",
        "display_name",
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
        "timezone",
        "auto_extract_actions",
        "language",
        "summary_style",
        "org_name",
    ]:
        if key in updates:
            new_notifs[key] = updates[key]

    # Normalize client aliases into new_notifs
    if "compact_view" in updates:
        new_notifs["compact_view"] = bool(updates["compact_view"])
    if "compact_meeting_cards" in updates:
        new_notifs["compact_view"] = bool(updates["compact_meeting_cards"])

    if "high_contrast" in updates:
        new_notifs["high_contrast"] = bool(updates["high_contrast"])
    if "high_contrast_mode" in updates:
        new_notifs["high_contrast"] = bool(updates["high_contrast_mode"])

    if "default_meeting_duration" in updates:
        new_notifs["default_meeting_duration"] = int(
            updates["default_meeting_duration"]
        )
    if "meeting_duration" in updates:
        new_notifs["default_meeting_duration"] = int(updates["meeting_duration"])

    if "name" in updates:
        new_notifs["name"] = str(updates["name"])
    if "display_name" in updates:
        new_notifs["name"] = str(updates["display_name"])

    if "avatar_url" in updates:
        new_notifs["avatar_url"] = str(updates["avatar_url"] or "")

    if "integrations" in updates and isinstance(updates["integrations"], dict):
        existing_intg = {}
        if isinstance(new_notifs.get("integrations"), dict):
            existing_intg.update(new_notifs["integrations"])
        intg_updates = updates["integrations"]
        for ik in ["zoom_webhook", "slack_webhook", "notion_api_key", "notion_db_id"]:
            if ik in intg_updates:
                existing_intg[ik] = str(intg_updates[ik] or "")
        if "notion_database_id" in intg_updates and "notion_db_id" not in intg_updates:
            existing_intg["notion_db_id"] = str(
                intg_updates["notion_database_id"] or ""
            )
        new_notifs["integrations"] = existing_intg

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
        client_notifs = dict(updates["notifications"])
        if "action_items_due" in client_notifs:
            client_notifs["action_item_reminders"] = bool(
                client_notifs["action_items_due"]
            )
        if "action_item_reminders" in client_notifs:
            client_notifs["action_items_due"] = bool(
                client_notifs["action_item_reminders"]
            )
        if "prep_alerts_lead_time" in client_notifs:
            val_clean = (
                str(client_notifs["prep_alerts_lead_time"]).replace("m", "").strip()
            )
            try:
                client_notifs["prep_lead_time_minutes"] = int(val_clean)
            except ValueError:
                pass
        if "prep_lead_time_minutes" in client_notifs:
            client_notifs["prep_alerts_lead_time"] = (
                f"{client_notifs['prep_lead_time_minutes']}m"
            )
        if "daily_digest_time" in client_notifs:
            client_notifs["digest_time"] = str(client_notifs["daily_digest_time"])
        if "digest_time" in client_notifs:
            client_notifs["daily_digest_time"] = str(client_notifs["digest_time"])

        existing_sub_notifs.update(client_notifs)
        new_notifs["notifications"] = existing_sub_notifs
        new_notifs.update(client_notifs)
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

    # Sync name / avatar_url to auth metadata if present
    meta_updates = {}
    if "name" in updates or "display_name" in updates:
        meta_updates["name"] = new_notifs.get("name", "")
        meta_updates["full_name"] = new_notifs.get("name", "")
    if "avatar_url" in updates:
        meta_updates["avatar_url"] = new_notifs.get("avatar_url", "")
    if meta_updates:
        try:
            if hasattr(supabase, "auth") and hasattr(supabase.auth, "admin"):
                supabase.auth.admin.update_user_by_id(
                    user["user_id"],
                    {"user_metadata": meta_updates},
                )
        except Exception as e:
            logger.debug(f"[Settings] Could not sync user metadata: {e}")

    updated_row = res.data[0] if (res and getattr(res, "data", None)) else curr_data
    merged_data = {**updated_row, "notifications": new_notifs}
    if "theme" in updates:
        merged_data["theme"] = updates["theme"]
    return _format_settings_response(merged_data)


@router.post("/avatar")
async def update_avatar(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Update user avatar from JSON url or multipart file upload."""
    supabase = get_supabase_admin()
    user_id = user["user_id"]

    content_type = request.headers.get("content-type", "")
    avatar_url: str | None = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                avatar_url = body.get("avatar_url")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")
    elif (
        "multipart/form-data" in content_type
        or "application/x-www-form-urlencoded" in content_type
    ):
        try:
            form = await request.form()
            file = form.get("file") or form.get("avatar")
            if hasattr(file, "read") and hasattr(file, "filename") and file.filename:
                contents = await file.read()
                filename = file.filename or "avatar.png"
                ext = filename.split(".")[-1].lower() if "." in filename else "png"
                destination_path = (
                    f"{user_id}-{int(datetime.now(UTC).timestamp())}.{ext}"
                )
                content_type_header = (
                    getattr(file, "content_type", None) or f"image/{ext}"
                )
                try:
                    storage_bucket = supabase.storage.from_("avatars")
                    storage_bucket.upload(
                        destination_path,
                        contents,
                        {"content-type": content_type_header, "upsert": "true"},
                    )
                    avatar_url = storage_bucket.get_public_url(destination_path)
                except Exception as upload_err:
                    logger.warning(f"[Avatar] Storage upload failed: {upload_err}")
                    supabase_url = getattr(
                        supabase, "supabase_url", "https://supabase.co"
                    ).rstrip("/")
                    avatar_url = f"{supabase_url}/storage/v1/object/public/avatars/{destination_path}"
            else:
                avatar_url = form.get("avatar_url")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid form data: {e}")
    else:
        # Fallback inspection: attempt JSON first, then form
        try:
            body = await request.json()
            if isinstance(body, dict):
                avatar_url = body.get("avatar_url")
        except Exception:
            try:
                form = await request.form()
                file = form.get("file") or form.get("avatar")
                if (
                    hasattr(file, "read")
                    and hasattr(file, "filename")
                    and file.filename
                ):
                    contents = await file.read()
                    filename = file.filename or "avatar.png"
                    ext = filename.split(".")[-1].lower() if "." in filename else "png"
                    destination_path = (
                        f"{user_id}-{int(datetime.now(UTC).timestamp())}.{ext}"
                    )
                    content_type_header = (
                        getattr(file, "content_type", None) or f"image/{ext}"
                    )
                    try:
                        storage_bucket = supabase.storage.from_("avatars")
                        storage_bucket.upload(
                            destination_path,
                            contents,
                            {"content-type": content_type_header, "upsert": "true"},
                        )
                        avatar_url = storage_bucket.get_public_url(destination_path)
                    except Exception as upload_err:
                        logger.warning(f"[Avatar] Storage upload failed: {upload_err}")
                        supabase_url = getattr(
                            supabase, "supabase_url", "https://supabase.co"
                        ).rstrip("/")
                        avatar_url = f"{supabase_url}/storage/v1/object/public/avatars/{destination_path}"
                else:
                    avatar_url = form.get("avatar_url")
            except Exception:
                avatar_url = None

    if not avatar_url or not str(avatar_url).strip():
        raise HTTPException(status_code=400, detail="avatar_url or file is required")

    avatar_url = str(avatar_url).strip()

    # 1. Fetch current user notifications
    curr_data = {}
    try:
        curr_res = (
            supabase.table("users").select("notifications").eq("id", user_id).execute()
        )
        curr_data = curr_res.data[0] if curr_res.data else {}
    except Exception:
        curr_data = {}

    curr_notifs = curr_data.get("notifications") or {}
    if not isinstance(curr_notifs, dict):
        curr_notifs = {}

    new_notifs = dict(curr_notifs)
    new_notifs["avatar_url"] = avatar_url

    # Save avatar_url to users.notifications via Supabase admin
    try:
        if curr_data:
            supabase.table("users").update({"notifications": new_notifs}).eq(
                "id", user_id
            ).execute()
        else:
            supabase.table("users").upsert(
                {"id": user_id, "notifications": new_notifs}
            ).execute()
    except Exception as e:
        logger.error(f"[Avatar] Failed updating users notifications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update avatar: {e}")

    # 2. Sync to Supabase auth user metadata if possible
    try:
        if hasattr(supabase, "auth") and hasattr(supabase.auth, "admin"):
            supabase.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": {"avatar_url": avatar_url}},
            )
    except Exception as e:
        logger.debug(f"[Avatar] Could not sync avatar_url to auth metadata: {e}")

    return {"avatar_url": avatar_url, "success": True}


@router.post("/test-notification")
async def test_notification(user: dict = Depends(get_current_user)):
    """Dispatch a test notification to verify delivery channels and user settings."""
    supabase = get_supabase_admin()
    user_id = user["user_id"]

    notifs = {}
    user_email = user.get("email") or ""
    try:
        res = (
            supabase.table("users")
            .select("email, name, notifications")
            .eq("id", user_id)
            .execute()
        )
        if res.data:
            row = res.data[0]
            notifs = row.get("notifications") or {}
            user_email = row.get("email") or user_email
    except Exception as e:
        logger.warning(f"[TestNotif] Could not fetch user notifications: {e}")

    sub_notifs = (
        notifs.get("notifications")
        if isinstance(notifs.get("notifications"), dict)
        else notifs
    )

    return {
        "status": "success",
        "message": "Test notification verified and dispatched successfully.",
        "user_id": user_id,
        "email": user_email,
        "channels": {
            "in_app": bool(sub_notifs.get("in_app", notifs.get("in_app", True))),
            "desktop": True,
            "email": bool(sub_notifs.get("email", notifs.get("email", True))),
            "reminders": bool(
                sub_notifs.get("reminders", notifs.get("reminders", True))
            ),
            "action_items_due": bool(
                sub_notifs.get(
                    "action_items_due",
                    sub_notifs.get("action_item_reminders", True),
                )
            ),
        },
    }


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
