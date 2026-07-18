from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from app.core.config import get_settings
from app.core.db import CATEGORY_TO_COLLECTION, COLLECTIONS, ENTITY_COLLECTIONS, get_db
from app.core.deps import get_current_admin
from app.core.utils import parse_object_id
from app.schemas.item import ItemOut, serialize_item
from app.schemas.ministry import (
    MinistryCreate,
    MinistryOut,
    MinistryUpdate,
    serialize_ministry,
)
from app.schemas.pillar import PillarCreate, PillarOut
from app.schemas.upload import ManualItemCreate
from app.services.lookups import get_item_counts_by_ministry, get_latest_issue_id, get_ministry_map, get_pillar_names
from app.services.ministry_resolver import find_entity_by_id, resolve_ministry

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UpdateItemMinistriesIn(BaseModel):
    ministry_id: str
    additional_ministry_ids: list[str] = []


class MergeMinistryIn(BaseModel):
    target_id: str


class MergeMinistryOut(BaseModel):
    items_moved: int


@router.get("/ministries", response_model=list[MinistryOut])
async def admin_list_ministries(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    docs: list[dict] = []
    for collection_name in ENTITY_COLLECTIONS:
        docs.extend([doc async for doc in db[collection_name].find()])
    docs.sort(key=lambda d: d["name"])
    counts = await get_item_counts_by_ministry(db)
    return [serialize_ministry(doc, counts.get(doc["_id"], 0)) for doc in docs]


@router.post("/ministries", response_model=MinistryOut, status_code=201)
async def create_ministry(
    payload: MinistryCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    collection_name = CATEGORY_TO_COLLECTION[payload.category]
    try:
        result = await db[collection_name].insert_one(payload.model_dump())
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Ministry with this name already exists")

    doc = await db[collection_name].find_one({"_id": result.inserted_id})
    return serialize_ministry(doc)


@router.patch("/ministries/{ministry_id}", response_model=MinistryOut)
async def update_ministry(
    ministry_id: str,
    payload: MinistryUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    oid = parse_object_id(ministry_id, "Ministry not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}

    current_doc = await find_entity_by_id(db, oid)
    if not current_doc:
        raise HTTPException(status_code=404, detail="Ministry not found")

    current_collection = CATEGORY_TO_COLLECTION[current_doc.get("category") or "ministry"]
    new_category = updates.get("category")
    target_collection = CATEGORY_TO_COLLECTION[new_category] if new_category else current_collection

    if updates:
        try:
            if target_collection == current_collection:
                result = await db[current_collection].update_one({"_id": oid}, {"$set": updates})
                if result.matched_count == 0:
                    raise HTTPException(status_code=404, detail="Ministry not found")
            else:
                # Category changed: the entity moves to a different collection,
                # so it's a delete-from-old + insert-into-new preserving the
                # same _id (policy_items reference it directly by id, not by
                # collection).
                moved_doc = {**current_doc, **updates}
                await db[target_collection].insert_one(moved_doc)
                await db[current_collection].delete_one({"_id": oid})
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="Ministry with this name already exists")

    doc = await db[target_collection].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Ministry not found")
    return serialize_ministry(doc)


@router.post("/ministries/{ministry_id}/merge", response_model=MergeMinistryOut)
async def merge_ministry(
    ministry_id: str,
    payload: MergeMinistryIn,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    """Consolidates a duplicate/misfiled entity into another — e.g. a
    department auto-created as its own entity (see ministry_resolver.py's
    docstring for why that happens) that should really be folded into its
    parent ministry, or two spellings of the same body. Repoints every item
    that referenced the source (as primary ministry_id or within
    additional_ministry_ids) to the target, then deletes the source."""
    source_oid = parse_object_id(ministry_id, "Ministry not found")
    target_oid = parse_object_id(payload.target_id, "Target ministry not found")
    if source_oid == target_oid:
        raise HTTPException(status_code=422, detail="Cannot merge a ministry into itself")

    source_doc = await find_entity_by_id(db, source_oid)
    if not source_doc:
        raise HTTPException(status_code=404, detail="Ministry not found")
    if not await find_entity_by_id(db, target_oid):
        raise HTTPException(status_code=404, detail="Target ministry not found")

    items = db[COLLECTIONS["policy_items"]]
    primary_result = await items.update_many(
        {"ministry_id": source_oid},
        {"$set": {"ministry_id": target_oid}, "$pull": {"additional_ministry_ids": target_oid}},
    )
    # Only add the target into additional_ministry_ids when it isn't
    # already that item's primary — otherwise it'd end up listed as both
    # the item's primary ministry and one of its additional links.
    await items.update_many(
        {"additional_ministry_ids": source_oid, "ministry_id": {"$ne": target_oid}},
        {"$addToSet": {"additional_ministry_ids": target_oid}},
    )
    additional_result = await items.update_many(
        {"additional_ministry_ids": source_oid}, {"$pull": {"additional_ministry_ids": source_oid}}
    )

    source_collection = CATEGORY_TO_COLLECTION[source_doc.get("category") or "ministry"]
    await db[source_collection].delete_one({"_id": source_oid})

    return MergeMinistryOut(items_moved=primary_result.modified_count + additional_result.modified_count)


@router.delete("/ministries/{ministry_id}", status_code=204)
async def delete_ministry(
    ministry_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    oid = parse_object_id(ministry_id, "Ministry not found")
    doc = await find_entity_by_id(db, oid)
    if not doc:
        raise HTTPException(status_code=404, detail="Ministry not found")
    collection_name = CATEGORY_TO_COLLECTION[doc.get("category") or "ministry"]
    result = await db[collection_name].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ministry not found")


@router.patch("/items/{item_id}/ministries", response_model=ItemOut)
async def update_item_ministries(
    item_id: str,
    payload: UpdateItemMinistriesIn,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    """Lets an admin link an existing item to an additional ministry/
    regulatory body (or change its primary one) after the fact — the item
    then shows up under every linked entity's directory/tab."""
    oid = parse_object_id(item_id, "Item not found")
    primary_oid = parse_object_id(payload.ministry_id, "Ministry not found")
    additional_oids = [parse_object_id(mid, "Ministry not found") for mid in payload.additional_ministry_ids]

    all_oids = [primary_oid] + additional_oids
    unique_oids = set(str(o) for o in all_oids)
    found = 0
    for collection_name in ENTITY_COLLECTIONS:
        found += await db[collection_name].count_documents({"_id": {"$in": all_oids}})
    if found != len(unique_oids):
        raise HTTPException(status_code=404, detail="One or more ministries/regulatory bodies not found")

    result = await db[COLLECTIONS["policy_items"]].update_one(
        {"_id": oid},
        {"$set": {"ministry_id": primary_oid, "additional_ministry_ids": additional_oids, "needs_ministry_review": False}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")

    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid})
    ministry_map = await get_ministry_map(db)
    return serialize_item(doc, ministry_map)


@router.post("/items", response_model=ItemOut, status_code=201)
async def create_manual_item(
    payload: ManualItemCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    """Supplementary, non-spec endpoint backing the frontend's original manual
    single-item Upload form, kept alongside the spec's real file-based ingestion
    (POST /api/admin/issues/upload). See reconciliation note."""
    settings = get_settings()

    if payload.issue_id:
        issue_oid = parse_object_id(payload.issue_id, "Issue not found")
        issue_doc = await db[COLLECTIONS["issues"]].find_one({"_id": issue_oid})
        if not issue_doc:
            raise HTTPException(status_code=404, detail="Issue not found")
    else:
        latest = await get_latest_issue_id(db)
        if not latest:
            raise HTTPException(status_code=400, detail="No issues exist yet to attach this item to")
        issue_oid = parse_object_id(latest)

    ministry_id, _score = await resolve_ministry(db, payload.ministry, settings.MINISTRY_MATCH_THRESHOLD)

    valid_pillars = await get_pillar_names(db)
    if payload.theme not in valid_pillars:
        raise HTTPException(
            status_code=422,
            detail=f"'{payload.theme}' is not a recognized theme. Valid themes: {', '.join(valid_pillars)}",
        )

    now = datetime.now(timezone.utc)
    doc = {
        "title": payload.title,
        "description": payload.description,
        "pillar": payload.theme,
        "subtype": "Announcement",
        "status": payload.status,
        "impact_level": payload.impact,
        "ministry_id": ministry_id,
        "sources": [s.model_dump() for s in payload.sources],
        "tags": payload.tags,
        "issue_id": issue_oid,
        "item_date": datetime(2026, _month_for(payload.date), payload.dateValue),
        "key_features": None,
        "why_it_matters": None,
        "parsing_meta": {"ministry_match_score": _score},
        "created_at": now,
        "updated_at": now,
    }
    result = await db[COLLECTIONS["policy_items"]].insert_one(doc)
    doc["_id"] = result.inserted_id

    ministry_map = await get_ministry_map(db)
    return serialize_item(doc, ministry_map)


@router.get("/pillars", response_model=list[PillarOut])
async def admin_list_pillars(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    docs = [doc async for doc in db[COLLECTIONS["pillars"]].find().sort("name", 1)]
    return [PillarOut(id=str(doc["_id"]), name=doc["name"]) for doc in docs]


@router.post("/pillars", response_model=PillarOut, status_code=201)
async def create_pillar(
    payload: PillarCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Theme name cannot be empty")
    try:
        result = await db[COLLECTIONS["pillars"]].insert_one(
            {"name": name, "created_at": datetime.now(timezone.utc)}
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="A theme with this name already exists")
    return PillarOut(id=str(result.inserted_id), name=name)


@router.delete("/pillars/{pillar_id}", status_code=204)
async def delete_pillar(
    pillar_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    """No reassignment cascade — items keep their existing pillar string even
    after it's removed from the active list, same as ministry deletion."""
    oid = parse_object_id(pillar_id, "Theme not found")
    result = await db[COLLECTIONS["pillars"]].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Theme not found")


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    """Intelligence/governance/evolution live as embedded sub-documents on the
    item itself, not separate collections, so a single delete_one is enough —
    no cascade needed."""
    oid = parse_object_id(item_id, "Item not found")
    result = await db[COLLECTIONS["policy_items"]].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")


_MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}


def _month_for(date_str: str) -> int:
    parts = date_str.strip().split()
    if len(parts) >= 2 and parts[1] in _MONTHS:
        return _MONTHS[parts[1]]
    return datetime.now(timezone.utc).month
