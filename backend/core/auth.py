from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from .config import settings
from .database import get_supabase

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Validate Supabase JWT token and return user payload.
    In development mode, falls back to a mock user if token is missing/invalid.
    """
    if credentials is None:
        if settings.ENVIRONMENT == "development":
            return {"user_id": "11111111-1111-4111-8111-111111111111", "org_id": "22222222-2222-4222-8222-222222222222", "email": "dev@meetmaxxing.ai"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )
    token = credentials.credentials
    if settings.ENVIRONMENT == "development" and token in ["mock_token", "dev_token", "dev"]:
        return {"user_id": "11111111-1111-4111-8111-111111111111", "org_id": "22222222-2222-4222-8222-222222222222", "email": "dev@meetmaxxing.ai"}
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_ANON_KEY,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub")
        org_id: str = payload.get("app_metadata", {}).get("org_id", user_id)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "org_id": org_id, "email": payload.get("email")}
    except (JWTError, Exception) as e:
        if settings.ENVIRONMENT == "development":
            return {"user_id": "11111111-1111-4111-8111-111111111111", "org_id": "22222222-2222-4222-8222-222222222222", "email": "dev@meetmaxxing.ai"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {e}",
        )


# Convenience type alias for route dependencies
CurrentUser = dict
