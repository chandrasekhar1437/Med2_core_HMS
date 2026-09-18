from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from bson import ObjectId
from bson.errors import InvalidId
from typing import List
from app.database import get_db
from app.config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
) -> dict:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub") or payload.get("id")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        user_oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise credentials_exception

    user = await db["users"].find_one({"_id": user_oid})
    if not user:
        raise credentials_exception

    user["_id"] = str(user["_id"])
    user["id"] = user["_id"]
    user["role"] = user.get("role", "patient").lower()
    return user


def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role", "patient").lower()
        allowed = [r.lower() for r in allowed_roles]
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles}"
            )
        return current_user
    return role_checker