from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_db
from app.services.lookups import get_pillar_names

router = APIRouter(prefix="/api/pillars", tags=["pillars"])


@router.get("", response_model=list[str])
async def list_pillars(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await get_pillar_names(db)
