from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from loguru import logger

bearer_scheme = HTTPBearer(auto_error=False)


async def get_user_from_token(token: str) -> dict:
    """Validate a Supabase JWT and return the user payload.

    Shared by the REST dependency (`get_current_user`) and the WebSocket
    endpoint, which cannot use the Bearer header and receives the token via
    query param or `Sec-WebSocket-Protocol` subprotocol instead.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Fast path: locally verify JWT signature with SUPABASE_JWT_SECRET (0.05ms vs 250ms HTTP call)
    from .config import settings

    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True},
            )
            user_id = payload.get("sub")
            if user_id:
                org_id = payload.get("app_metadata", {}).get("org_id", user_id)
                return {
                    "user_id": user_id,
                    "org_id": org_id,
                    "email": payload.get("email"),
                }
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except Exception as e:
            logger.debug("[Auth] Local JWT decode failed, trying remote: {}", e)

    try:
        import asyncio
        from .database import get_supabase

        supabase = get_supabase()

        # Non-blocking threadpool fallback to Supabase Auth API
        user_resp = await asyncio.to_thread(supabase.auth.get_user, token)
        if not user_resp or not user_resp.user:
            logger.warning("[Auth] Supabase returned no user for token")
            raise HTTPException(status_code=401, detail="Invalid token")

        user = user_resp.user

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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Validate Supabase JWT token and return user payload."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    return await get_user_from_token(credentials.credentials)
