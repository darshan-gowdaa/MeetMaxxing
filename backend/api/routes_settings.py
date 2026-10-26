"""
Settings endpoints.
"""

from fastapi import APIRouter, Depends, Request

from ..core.auth import get_current_user
from ..core.database import get_supabase_admin
from ..services.settings_service import (
    _format_settings_response,
    export_gdpr_user_data,
    fetch_user_settings,
    format_settings_response,
    get_test_notification_status,
    persist_user_settings,
    process_avatar_request,
    reset_user_account_data,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/")
async def get_settings(user: dict = Depends(get_current_user)):
    """Fetch current user application settings and preferences."""
    supabase = get_supabase_admin()
    return fetch_user_settings(supabase, user["user_id"])


@router.patch("/")
async def update_settings(updates: dict, user: dict = Depends(get_current_user)):
    """Update user application settings, theme, notifications, or integrations."""
    supabase = get_supabase_admin()
    return persist_user_settings(supabase, user["user_id"], updates)


@router.post("/avatar")
async def update_avatar(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Update user avatar from JSON url or multipart file upload."""
    supabase = get_supabase_admin()
    return await process_avatar_request(supabase, user["user_id"], request)


@router.post("/test-notification")
async def test_notification(user: dict = Depends(get_current_user)):
    """Dispatch a test notification to verify delivery channels and user settings."""
    supabase = get_supabase_admin()
    return get_test_notification_status(supabase, user)


@router.post("/export")
async def export_user_data(user: dict = Depends(get_current_user)):
    """GDPR user data export. Gathers profile, settings, meetings, and action items."""
    supabase = get_supabase_admin()
    return await export_gdpr_user_data(supabase, user, get_settings_fn=get_settings)


@router.post("/reset")
async def reset_settings(user: dict = Depends(get_current_user)):
    """Reset user settings and notifications back to defaults."""
    supabase = get_supabase_admin()
    return reset_user_account_data(supabase, user["user_id"])
