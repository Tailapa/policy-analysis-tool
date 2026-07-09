from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    payload = decode_access_token(credentials.credentials)
    if payload is None or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = await db[COLLECTIONS["admin_users"]].find_one({"email": payload["sub"]})
    if user is None:
        raise HTTPException(status_code=401, detail="Admin user no longer exists")

    return user
