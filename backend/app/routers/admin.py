from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from app.core.config import get_settings
from app.core.db import COLLECTIONS, get_db
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
from app.services.geo_tagger import parse_geography_string
from app.services.lookups import get_latest_issue_id, get_pillar_names
from app.services.ministry_resolver import resolve_ministry
from app.services.policy_governance import generate_governance_for_item
from app.services.policy_intelligence import generate_intelligence_for_item

router = APIRouter(prefix="/api/admin", tags=["admin"])


class BulkGenerateOut(BaseModel):
    queued_intelligence: int
    queued_governance: int


@router.get("/ministries", response_model=list[MinistryOut])
async def admin_list_ministries(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    docs = [doc async for doc in db[COLLECTIONS["ministries"]].find().sort("name", 1)]
    counts = {
        row["_id"]: row["count"]
        async for row in db[COLLECTIONS["policy_items"]].aggregate(
            [{"$group": {"_id": "$ministry_id", "count": {"$sum": 1}}}]
        )
    }
    return [serialize_ministry(doc, counts.get(doc["_id"], 0)) for doc in docs]


@router.post("/ministries", response_model=MinistryOut, status_code=201)
async def create_ministry(
    payload: MinistryCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    try:
        result = await db[COLLECTIONS["ministries"]].insert_one(payload.model_dump())
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Ministry with this name already exists")

    doc = await db[COLLECTIONS["ministries"]].find_one({"_id": result.inserted_id})
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
    if updates:
        try:
            result = await db[COLLECTIONS["ministries"]].update_one({"_id": oid}, {"$set": updates})
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="Ministry with this name already exists")
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ministry not found")

    doc = await db[COLLECTIONS["ministries"]].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Ministry not found")
    return serialize_ministry(doc)


@router.delete("/ministries/{ministry_id}", status_code=204)
async def delete_ministry(
    ministry_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    oid = parse_object_id(ministry_id, "Ministry not found")
    result = await db[COLLECTIONS["ministries"]].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ministry not found")


@router.post(
    "/ministries/{ministry_id}/generate-intelligence", response_model=BulkGenerateOut, status_code=202
)
async def bulk_generate_ministry_intelligence(
    ministry_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    """Queues policy Intelligence and/or Governance generation for every item
    in this ministry that's missing one or the other — a one-click way to
    fill in a ministry's coverage rather than triggering each item
    individually. Only queues the pipeline(s) actually missing per item, and
    never re-queues items that already have both (no force option here —
    use the per-item admin endpoints for an explicit regeneration)."""
    oid = parse_object_id(ministry_id, "Ministry not found")
    ministry_doc = await db[COLLECTIONS["ministries"]].find_one({"_id": oid}, {"_id": 1})
    if not ministry_doc:
        raise HTTPException(status_code=404, detail="Ministry not found")

    cursor = db[COLLECTIONS["policy_items"]].find(
        {"ministry_id": oid, "$or": [{"intelligence": None}, {"governance": None}]},
        {"_id": 1, "intelligence": 1, "governance": 1},
    )
    queued_intelligence = 0
    queued_governance = 0
    async for doc in cursor:
        if doc.get("intelligence") is None:
            background_tasks.add_task(generate_intelligence_for_item, db, doc["_id"])
            queued_intelligence += 1
        if doc.get("governance") is None:
            background_tasks.add_task(generate_governance_for_item, db, doc["_id"])
            queued_governance += 1

    return BulkGenerateOut(queued_intelligence=queued_intelligence, queued_governance=queued_governance)


@router.post("/items", response_model=ItemOut, status_code=201)
async def create_manual_item(
    payload: ManualItemCreate,
    background_tasks: BackgroundTasks,
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

    scope, states = parse_geography_string(payload.geography)

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
        "geography": {"scope": scope, "states": states},
        "tags": payload.tags,
        "issue_id": issue_oid,
        "item_date": datetime(2026, _month_for(payload.date), payload.dateValue),
        "key_features": None,
        "why_it_matters": None,
        "embedding": None,
        "parsing_meta": {"ministry_match_score": _score, "geo_match_terms": []},
        "created_at": now,
        "updated_at": now,
    }
    result = await db[COLLECTIONS["policy_items"]].insert_one(doc)
    doc["_id"] = result.inserted_id
    background_tasks.add_task(generate_intelligence_for_item, db, doc["_id"])
    background_tasks.add_task(generate_governance_for_item, db, doc["_id"])

    ministry_doc = await db[COLLECTIONS["ministries"]].find_one({"_id": ministry_id})
    return serialize_item(doc, ministry_doc["name"] if ministry_doc else payload.ministry)


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
