from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS


async def get_ministry_name_map(db: AsyncIOMotorDatabase) -> dict[str, str]:
    cursor = db[COLLECTIONS["ministries"]].find({}, {"name": 1})
    return {str(doc["_id"]): doc["name"] async for doc in cursor}


async def get_latest_issue_id(db: AsyncIOMotorDatabase) -> str | None:
    doc = await db[COLLECTIONS["issues"]].find_one(sort=[("published_at", -1)])
    return str(doc["_id"]) if doc else None


async def get_pillar_names(db: AsyncIOMotorDatabase) -> list[str]:
    cursor = db[COLLECTIONS["pillars"]].find({}, {"name": 1}).sort("name", 1)
    return [doc["name"] async for doc in cursor]
