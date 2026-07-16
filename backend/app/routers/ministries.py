from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, ENTITY_COLLECTIONS, get_db
from app.core.utils import parse_object_id
from app.schemas.issue import serialize_issue
from app.schemas.item import serialize_item
from app.schemas.ministry import MinistryDetailOut, MinistryOut, serialize_ministry
from app.services.lookups import get_item_counts_by_ministry, get_ministry_map
from app.services.ministry_resolver import find_entity_by_id

router = APIRouter(prefix="/api/ministries", tags=["ministries"])


@router.get("", response_model=list[MinistryOut])
async def list_ministries(q: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"minister_name": {"$regex": q, "$options": "i"}},
        ]

    docs: list[dict] = []
    for collection_name in ENTITY_COLLECTIONS:
        docs.extend([doc async for doc in db[collection_name].find(query)])
    docs.sort(key=lambda d: d["name"])
    counts = await get_item_counts_by_ministry(db)
    return [serialize_ministry(doc, counts.get(doc["_id"], 0)) for doc in docs]


@router.get("/{ministry_id}", response_model=MinistryDetailOut)
async def get_ministry(ministry_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(ministry_id, "Ministry not found")
    doc = await find_entity_by_id(db, oid)
    if not doc:
        raise HTTPException(status_code=404, detail="Ministry not found")

    item_docs = [
        item
        async for item in db[COLLECTIONS["policy_items"]]
        .find({"$or": [{"ministry_id": oid}, {"additional_ministry_ids": oid}]})
        .sort("item_date", -1)
    ]
    ministry_map = await get_ministry_map(db)
    items = [serialize_item(item, ministry_map) for item in item_docs]

    base = serialize_ministry(doc, len(items))
    return MinistryDetailOut(**base.model_dump(), items=items)
