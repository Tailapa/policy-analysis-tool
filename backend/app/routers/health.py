from fastapi import APIRouter

from app.core.db import ping_db

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health():
    db_ok = await ping_db()
    return {"status": "ok", "db": "ok" if db_ok else "error"}
