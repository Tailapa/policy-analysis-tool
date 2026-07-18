from typing import Optional

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.utils import parse_object_id
from app.schemas.stats import (
    MinistryStat,
    PillarStat,
    StatsSummary,
)
from app.services.lookups import get_latest_issue_id, get_pillar_names
from app.services.ministry_resolver import find_entity_by_id

router = APIRouter(prefix="/api/stats", tags=["stats"])


async def _resolve_issue_filter(issue_id: Optional[str], db: AsyncIOMotorDatabase, default_to_latest: bool) -> dict:
    if issue_id:
        return {"issue_id": parse_object_id(issue_id)}
    if default_to_latest:
        latest = await get_latest_issue_id(db)
        if latest:
            return {"issue_id": parse_object_id(latest)}
    return {}


@router.get("/summary", response_model=StatsSummary)
async def stats_summary(issue_id: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    match = await _resolve_issue_filter(issue_id, db, default_to_latest=True)
    collection = db[COLLECTIONS["policy_items"]]

    total = await collection.count_documents(match)
    policy_updates = await collection.count_documents({**match, "subtype": "Policy Update"})
    announcements = await collection.count_documents({**match, "subtype": "Announcement"})
    high_impact = await collection.count_documents({**match, "impact_level": "High"})

    return StatsSummary(
        total=total, policy_updates=policy_updates, announcements=announcements, high_impact=high_impact
    )


@router.get("/ministries", response_model=list[MinistryStat])
async def stats_ministries(issue_id: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    match = await _resolve_issue_filter(issue_id, db, default_to_latest=False)
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$ministry_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    rows = [row async for row in db[COLLECTIONS["policy_items"]].aggregate(pipeline)]

    result = []
    for row in rows:
        ministry_doc = await find_entity_by_id(db, row["_id"]) if row["_id"] else None
        result.append(
            MinistryStat(
                ministry_id=str(row["_id"]),
                name=ministry_doc["name"] if ministry_doc else "Unknown Ministry",
                count=row["count"],
            )
        )
    return result


@router.get("/pillars", response_model=list[PillarStat])
async def stats_pillars(issue_id: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    match = await _resolve_issue_filter(issue_id, db, default_to_latest=False)
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$pillar", "count": {"$sum": 1}}},
    ]
    rows = {row["_id"]: row["count"] async for row in db[COLLECTIONS["policy_items"]].aggregate(pipeline)}
    pillars = await get_pillar_names(db)
    return [PillarStat(pillar=p, count=rows.get(p, 0)) for p in pillars]
