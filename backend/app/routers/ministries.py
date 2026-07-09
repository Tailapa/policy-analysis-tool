from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.utils import parse_object_id
from app.schemas.issue import serialize_issue
from app.schemas.item import serialize_item
from app.schemas.ministry import MinistryDetailOut, MinistryOut, serialize_ministry

router = APIRouter(prefix="/api/ministries", tags=["ministries"])


async def _item_counts_by_ministry(db: AsyncIOMotorDatabase) -> dict:
    return {
        row["_id"]: row["count"]
        async for row in db[COLLECTIONS["policy_items"]].aggregate(
            [{"$group": {"_id": "$ministry_id", "count": {"$sum": 1}}}]
        )
    }


@router.get("", response_model=list[MinistryOut])
async def list_ministries(q: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"minister_name": {"$regex": q, "$options": "i"}},
        ]

    docs = [doc async for doc in db[COLLECTIONS["ministries"]].find(query).sort("name", 1)]
    counts = await _item_counts_by_ministry(db)
    return [serialize_ministry(doc, counts.get(doc["_id"], 0)) for doc in docs]


@router.get("/{ministry_id}", response_model=MinistryDetailOut)
async def get_ministry(ministry_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(ministry_id, "Ministry not found")
    doc = await db[COLLECTIONS["ministries"]].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Ministry not found")

    item_docs = [
        item
        async for item in db[COLLECTIONS["policy_items"]]
        .find({"ministry_id": oid})
        .sort("item_date", -1)
    ]
    items = [serialize_item(item, doc["name"]) for item in item_docs]

    base = serialize_ministry(doc, len(items))
    return MinistryDetailOut(**base.model_dump(), items=items)
