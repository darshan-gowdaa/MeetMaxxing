"""
Auth endpoints — user provisioning, token refresh, session info.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_supabase_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh")
async def refresh_token(body: RefreshRequest):
    """Exchange a Supabase refresh_token for a new access_token."""
    import httpx
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token"
    async with httpx.AsyncClient() as client:
        res = await client.post(
            url,
            json={"refresh_token": body.refresh_token},
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
        )
    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Token refresh failed")
    data = res.json()
    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "expires_in": data.get("expires_in"),
    }


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return current authenticated user info."""
    return {
        "user_id": user["user_id"],
        "org_id": user["org_id"],
        "email": user.get("email"),
    }


@router.delete("/me")
async def delete_me(user: dict = Depends(get_current_user)):
    """Delete current user."""
    # 1. Delete public.users record (which cascades to meetings, api keys, etc)
    try:
        get_supabase_admin().table("users").delete().eq("id", user["user_id"]).execute()
    except Exception as e:
        logging.warning(f"Failed to delete public.users record: {e}")

    # 2. Delete from auth schema
    get_supabase_admin().auth.admin.delete_user(user["user_id"])
    return {"deleted": True}


@router.post("/provision")
async def provision_user(user: dict = Depends(get_current_user)):
    """
    Ensure user has org_id set in app_metadata.
    Call this after signup/login so subsequent dashboard calls have org_id.
    New users get org_id = user_id (personal org).
    """
    supabase_admin = get_supabase_admin()
    org_id = user["user_id"]  # personal org = user_id for solo accounts

    # 1. Update app_metadata if needed
    if not user.get("org_id") or user["org_id"] == user["user_id"]:
        try:
            supabase_admin.auth.admin.update_user_by_id(
                user["user_id"],
                {"app_metadata": {"org_id": org_id}},
            )
        except Exception:
            pass

    # 2. Ensure public.users record exists (required for foreign keys)
    try:
        supabase_admin.table("users").upsert({
            "id": user["user_id"],
            "org_id": org_id,
            "email": user.get("email", ""),
        }, on_conflict="id").execute()
    except Exception as e:
        logging.warning(f"Failed to provision public.users record: {e}")

    return {"org_id": org_id, "provisioned": True}
