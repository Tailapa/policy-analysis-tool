from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.utils import parse_object_id
from app.schemas.item import ItemOut, PaginatedItems, serialize_item
from app.services.lookups import get_ministry_map

router = APIRouter(prefix="/api/items", tags=["items"])
states_router = APIRouter(prefix="/api/states", tags=["items"])


@router.get("", response_model=PaginatedItems)
async def list_items(
    pillar: Optional[str] = None,
    subtype: Optional[str] = None,
    status: Optional[str] = None,
    impact_level: Optional[str] = None,
    ministry_id: Optional[str] = None,
    state: Optional[str] = None,
    issue_id: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query: dict = {}
    if pillar:
        query["pillar"] = pillar
    if subtype:
        query["subtype"] = subtype
    if status:
        query["status"] = status
    if impact_level:
        query["impact_level"] = impact_level
    if ministry_id:
        oid = parse_object_id(ministry_id)
        query["$or"] = [{"ministry_id": oid}, {"additional_ministry_ids": oid}]
    if state:
        query["geography.states"] = state
    if issue_id:
        query["issue_id"] = parse_object_id(issue_id)
    if q:
        query["$text"] = {"$search": q}

    collection = db[COLLECTIONS["policy_items"]]
    total = await collection.count_documents(query)
    total_pages = max(1, (total + page_size - 1) // page_size)

    cursor = (
        collection.find(query)
        .sort("item_date", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    docs = [doc async for doc in cursor]

    ministry_map = await get_ministry_map(db)
    items = [serialize_item(doc, ministry_map) for doc in docs]

    return PaginatedItems(items=items, page=page, page_size=page_size, total=total, total_pages=total_pages)


@router.get("/{item_id}", response_model=ItemOut)
async def get_item(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(item_id, "Item not found")
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")

    ministry_map = await get_ministry_map(db)
    return serialize_item(doc, ministry_map)


@states_router.get("/{state_code}/items", response_model=list[ItemOut])
async def list_items_by_state(state_code: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    collection = db[COLLECTIONS["policy_items"]]
    cursor = collection.find({"geography.states": state_code}).sort("item_date", -1)
    docs = [doc async for doc in cursor]

    ministry_map = await get_ministry_map(db)
    return [serialize_item(doc, ministry_map) for doc in docs]
