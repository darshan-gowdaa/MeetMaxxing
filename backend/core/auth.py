from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from .config import settings

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Validate Supabase JWT token and return user payload.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = credentials.credentials
    
    try:
        # Supabase JWTs are typically signed with the JWT secret (HS256)
        jwt_secret = settings.SUPABASE_JWT_SECRET or settings.SUPABASE_ANON_KEY
        
        # Debug the actual header
        unverified_header = jwt.get_unverified_header(token)
        print(f"[Auth] Token header: {unverified_header}")
        
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256", "RS256", "HS512"],
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub")
        org_id: str = payload.get("app_metadata", {}).get("org_id", user_id)
        if not user_id:
            print("[Auth] Missing user_id in payload")
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "org_id": org_id, "email": payload.get("email")}
    except JWTError as e:
        print(f"[Auth] JWT validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


# Convenience type alias for route dependencies
CurrentUser = dict
