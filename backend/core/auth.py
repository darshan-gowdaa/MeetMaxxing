from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from loguru import logger

from .config import settings

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Validate Supabase JWT token and return user payload."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    token = credentials.credentials

    try:
        from .database import get_supabase
        supabase = get_supabase()

        # Verify the token and get the user securely via Supabase Auth
        user_resp = supabase.auth.get_user(token)
        if not user_resp or not user_resp.user:
            logger.warning("[Auth] Supabase returned no user for token")
            raise HTTPException(status_code=401, detail="Invalid token")

        user = user_resp.user

        # Decode locally (no signature check) to get org_id from app_metadata.
        # Security relies on the Supabase SDK call above — this is just metadata extraction.
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            org_id = payload.get("app_metadata", {}).get("org_id", user.id)
        except Exception:
            org_id = user.id

        return {"user_id": user.id, "org_id": org_id, "email": user.email}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("[Auth] JWT validation failed: {}", type(e).__name__)
        raise HTTPException(status_code=401, detail="Invalid token")
