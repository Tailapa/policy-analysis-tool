import re

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from rapidfuzz import fuzz, process

from app.core.db import COLLECTIONS


async def resolve_ministry(
    db: AsyncIOMotorDatabase, raw_name: str, threshold: int
) -> tuple[ObjectId, float]:
    """Fuzzy-match raw_name against ministries.name. Above threshold -> link existing.
    Below threshold -> auto-create a new ministries record (per backend-spec.md §5 step 3:
    there's no review step left to catch an unlinked item, so it has to resolve one way
    or another)."""

    collection = db[COLLECTIONS["ministries"]]
    name = raw_name.strip()

    exact = await collection.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if exact:
        return exact["_id"], 100.0

    existing_names = [doc["name"] async for doc in collection.find({}, {"name": 1})]
    if existing_names:
        match = process.extractOne(name, existing_names, scorer=fuzz.WRatio)
        if match and match[1] >= threshold:
            matched_doc = await collection.find_one({"name": match[0]})
            return matched_doc["_id"], float(match[1])

    result = await collection.insert_one(
        {
            "name": name,
            "minister_name": None,
            "department": None,
            "seal_url": None,
            "icon": "Building2",
        }
    )
    return result.inserted_id, 0.0
