from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, ENTITY_COLLECTIONS


async def get_ministry_name_map(db: AsyncIOMotorDatabase) -> dict[str, str]:
    result: dict[str, str] = {}
    for collection_name in ENTITY_COLLECTIONS:
        async for doc in db[collection_name].find({}, {"name": 1}):
            result[str(doc["_id"])] = doc["name"]
    return result


async def get_ministry_map(db: AsyncIOMotorDatabase) -> dict[str, dict]:
    """id -> {"name", "category"}, used to build ItemOut.linkedMinistries for
    items linked to more than one ministry/regulatory body. Merges the 3
    separate ministries/regulatory_bodies/misc_entities collections into one
    lookup, same shape as before the collection split."""
    result: dict[str, dict] = {}
    for collection_name in ENTITY_COLLECTIONS:
        async for doc in db[collection_name].find({}, {"name": 1, "category": 1}):
            result[str(doc["_id"])] = {"name": doc["name"], "category": doc.get("category") or "ministry"}
    return result


async def get_item_counts_by_ministry(db: AsyncIOMotorDatabase) -> dict:
    """Counts an item once per distinct linked ministry/regulatory body
    (primary ministry_id + any additional_ministry_ids), so a dual-linked
    item counts toward both. Two separate group-by passes (rather than one
    $concatArrays/$unwind pipeline) because mongomock — used in tests —
    doesn't resolve field references nested inside a literal array passed
    to $concatArrays; this shape works identically on real MongoDB and the
    test mock."""
    counts: dict = {}
    async for row in db[COLLECTIONS["policy_items"]].aggregate(
        [{"$group": {"_id": "$ministry_id", "count": {"$sum": 1}}}]
    ):
        counts[row["_id"]] = counts.get(row["_id"], 0) + row["count"]

    async for row in db[COLLECTIONS["policy_items"]].aggregate(
        [
            {"$match": {"additional_ministry_ids": {"$exists": True, "$ne": []}}},
            {"$unwind": "$additional_ministry_ids"},
            {"$group": {"_id": "$additional_ministry_ids", "count": {"$sum": 1}}},
        ]
    ):
        counts[row["_id"]] = counts.get(row["_id"], 0) + row["count"]

    return counts


async def get_latest_issue_id(db: AsyncIOMotorDatabase) -> str | None:
    doc = await db[COLLECTIONS["issues"]].find_one(sort=[("published_at", -1)])
    return str(doc["_id"]) if doc else None


async def get_pillar_names(db: AsyncIOMotorDatabase) -> list[str]:
    cursor = db[COLLECTIONS["pillars"]].find({}, {"name": 1}).sort("name", 1)
    return [doc["name"] async for doc in cursor]
