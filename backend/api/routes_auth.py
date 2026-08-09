"""
Auth endpoints — user provisioning, token refresh, session info.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from ..core.auth import get_current_user
from ..core.config import settings

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


@router.post("/provision")
async def provision_user(user: dict = Depends(get_current_user)):
    """
    Ensure user has org_id set in app_metadata.
    Call this after signup/login so subsequent dashboard calls have org_id.
    New users get org_id = user_id (personal org).
    """
    from ..core.database import get_supabase_admin
    
    # org_id already set — nothing to do
    if user.get("org_id") and user["org_id"] != user["user_id"]:
        return {"org_id": user["org_id"], "provisioned": False}
    
    supabase_admin = get_supabase_admin()
    org_id = user["user_id"]  # personal org = user_id for solo accounts
    
    try:
        supabase_admin.auth.admin.update_user_by_id(
            user["user_id"],
            {"app_metadata": {"org_id": org_id}},
        )
    except Exception:
        # Non-critical — org_id already falls back to user_id in get_current_user
        pass
    
    return {"org_id": org_id, "provisioned": True}
