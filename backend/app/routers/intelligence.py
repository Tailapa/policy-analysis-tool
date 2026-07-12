from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.deps import get_current_admin
from app.core.utils import parse_object_id
from app.schemas.intelligence import (
    BackfillResultOut,
    EngagementAggregateOut,
    EngagementBreakdownOut,
    EngagementBreakdownRow,
    GenerateQueuedOut,
    IntelligenceStatusOut,
    LifecycleAggregateOut,
    LifecycleStageCount,
    LowiAggregateOut,
    PolicyIntelligenceOut,
    SCTPAggregateOut,
    SCTPAggregatePoint,
)
from app.services.lookups import get_ministry_name_map, get_pillar_names
from app.services.policy_intelligence import backfill_missing_intelligence, generate_intelligence_for_item

item_intelligence_router = APIRouter(prefix="/api/items", tags=["intelligence"])
aggregate_router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])
admin_intelligence_router = APIRouter(prefix="/api/admin", tags=["admin", "intelligence"])

ALL_LIFECYCLE_STAGES = [
    "Problem Identification & Agenda Setting",
    "Policy Formulation",
    "Legitimation & Adoption",
    "Implementation",
    "Evaluation",
    "Maintenance, Succession & Termination",
]

SCTP_POINT_CAP = 500
ENGAGEMENT_BREAKDOWN_MINISTRY_CAP = 8


def _resolve_filters(
    issue_id: Optional[str], ministry_id: Optional[str], pillar: Optional[str]
) -> dict:
    """Cross-policy aggregate views default to the whole dataset (unlike
    stats.py's _resolve_issue_filter, which defaults to 'latest issue')."""
    match: dict = {"intelligence": {"$ne": None}}
    if issue_id:
        match["issue_id"] = parse_object_id(issue_id)
    if ministry_id:
        match["ministry_id"] = parse_object_id(ministry_id)
    if pillar:
        match["pillar"] = pillar
    return match


@item_intelligence_router.get("/{item_id}/intelligence", response_model=IntelligenceStatusOut)
async def get_item_intelligence(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(item_id, "Item not found")
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid}, {"intelligence": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")

    intelligence = doc.get("intelligence")
    if intelligence is None:
        return IntelligenceStatusOut(status="pending", intelligence=None)

    intelligence_out = dict(intelligence)
    intelligence_out["generated_at"] = intelligence_out["generated_at"].isoformat()
    return IntelligenceStatusOut(
        status="ready", intelligence=PolicyIntelligenceOut.model_validate(intelligence_out)
    )


@aggregate_router.get("/sctp", response_model=SCTPAggregateOut)
async def sctp_aggregate(
    issue_id: Optional[str] = None,
    ministry_id: Optional[str] = None,
    pillar: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    match = _resolve_filters(issue_id, ministry_id, pillar)
    collection = db[COLLECTIONS["policy_items"]]

    sample_size = await collection.count_documents(match)

    pipeline = [
        {"$match": match},
        {"$unwind": "$intelligence.sctp.groups"},
        {
            "$project": {
                "item_title": "$title",
                "ministry_id": "$ministry_id",
                "pillar": "$pillar",
                "group_name": "$intelligence.sctp.groups.group_name",
                "quadrant": "$intelligence.sctp.groups.quadrant",
                "power_score": "$intelligence.sctp.groups.power_score",
                "construction_score": "$intelligence.sctp.groups.construction_score",
            }
        },
        {"$limit": SCTP_POINT_CAP + 1},
    ]
    rows = [row async for row in collection.aggregate(pipeline)]
    truncated = len(rows) > SCTP_POINT_CAP
    rows = rows[:SCTP_POINT_CAP]

    ministry_names = await get_ministry_name_map(db)
    points = [
        SCTPAggregatePoint(
            item_id=str(row["_id"]),
            item_title=row["item_title"],
            ministry=ministry_names.get(str(row["ministry_id"]), "Unknown Ministry"),
            pillar=row["pillar"],
            group_name=row["group_name"],
            quadrant=row["quadrant"],
            power_score=row["power_score"],
            construction_score=row["construction_score"],
        )
        for row in rows
    ]
    return SCTPAggregateOut(points=points, sample_size=sample_size, truncated=truncated)


@aggregate_router.get("/engagement", response_model=EngagementAggregateOut)
async def engagement_aggregate(
    issue_id: Optional[str] = None,
    ministry_id: Optional[str] = None,
    pillar: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    match = _resolve_filters(issue_id, ministry_id, pillar)
    collection = db[COLLECTIONS["policy_items"]]

    sample_size = await collection.count_documents(match)
    pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": None,
                "avg_educate": {"$avg": "$intelligence.engagement.educate_score"},
                "avg_persuade": {"$avg": "$intelligence.engagement.persuade_score"},
                "avg_coerce": {"$avg": "$intelligence.engagement.coerce_score"},
                "avg_strengthen": {"$avg": "$intelligence.engagement.strengthen_score"},
                "avg_incentivize": {"$avg": "$intelligence.engagement.incentivize_score"},
            }
        },
    ]
    rows = [row async for row in collection.aggregate(pipeline)]
    if not rows:
        return EngagementAggregateOut(
            avg_educate=0, avg_persuade=0, avg_coerce=0, avg_strengthen=0, avg_incentivize=0, sample_size=0
        )
    row = rows[0]
    return EngagementAggregateOut(
        avg_educate=row["avg_educate"] or 0,
        avg_persuade=row["avg_persuade"] or 0,
        avg_coerce=row["avg_coerce"] or 0,
        avg_strengthen=row["avg_strengthen"] or 0,
        avg_incentivize=row["avg_incentivize"] or 0,
        sample_size=sample_size,
    )


@aggregate_router.get("/engagement-breakdown", response_model=EngagementBreakdownOut)
async def engagement_breakdown(
    group_by: str,
    issue_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if group_by not in ("ministry", "pillar"):
        raise HTTPException(status_code=422, detail="group_by must be 'ministry' or 'pillar'")

    match = _resolve_filters(issue_id, None, None)
    collection = db[COLLECTIONS["policy_items"]]
    group_field = "$ministry_id" if group_by == "ministry" else "$pillar"

    pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": group_field,
                "avg_educate": {"$avg": "$intelligence.engagement.educate_score"},
                "avg_persuade": {"$avg": "$intelligence.engagement.persuade_score"},
                "avg_coerce": {"$avg": "$intelligence.engagement.coerce_score"},
                "avg_strengthen": {"$avg": "$intelligence.engagement.strengthen_score"},
                "avg_incentivize": {"$avg": "$intelligence.engagement.incentivize_score"},
                "sample_size": {"$sum": 1},
            }
        },
    ]
    grouped = {row["_id"]: row async for row in collection.aggregate(pipeline)}

    def _row(label: str, data: dict) -> EngagementBreakdownRow:
        return EngagementBreakdownRow(
            label=label,
            avg_educate=data.get("avg_educate") or 0,
            avg_persuade=data.get("avg_persuade") or 0,
            avg_coerce=data.get("avg_coerce") or 0,
            avg_strengthen=data.get("avg_strengthen") or 0,
            avg_incentivize=data.get("avg_incentivize") or 0,
            sample_size=data.get("sample_size", 0),
        )

    if group_by == "pillar":
        pillars = await get_pillar_names(db)
        rows = [_row(pillar, grouped.get(pillar, {})) for pillar in pillars]
    else:
        ministry_names = await get_ministry_name_map(db)
        rows = [
            _row(ministry_names.get(str(ministry_id), "Unknown Ministry"), data)
            for ministry_id, data in grouped.items()
        ]
        rows.sort(key=lambda r: r.sample_size, reverse=True)
        rows = rows[:ENGAGEMENT_BREAKDOWN_MINISTRY_CAP]

    return EngagementBreakdownOut(group_by=group_by, rows=rows)


@aggregate_router.get("/lifecycle", response_model=LifecycleAggregateOut)
async def lifecycle_aggregate(
    issue_id: Optional[str] = None,
    ministry_id: Optional[str] = None,
    pillar: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    match = _resolve_filters(issue_id, ministry_id, pillar)
    collection = db[COLLECTIONS["policy_items"]]

    sample_size = await collection.count_documents(match)
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$intelligence.lifecycle.current_stage", "count": {"$sum": 1}}},
    ]
    counts = {row["_id"]: row["count"] async for row in collection.aggregate(pipeline)}
    distribution = [
        LifecycleStageCount(stage=stage, count=counts.get(stage, 0)) for stage in ALL_LIFECYCLE_STAGES
    ]
    return LifecycleAggregateOut(distribution=distribution, sample_size=sample_size)


@aggregate_router.get("/lowi", response_model=LowiAggregateOut)
async def lowi_aggregate(
    issue_id: Optional[str] = None,
    ministry_id: Optional[str] = None,
    pillar: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    match = _resolve_filters(issue_id, ministry_id, pillar)
    collection = db[COLLECTIONS["policy_items"]]

    sample_size = await collection.count_documents(match)
    pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": None,
                "avg_regulatory": {"$avg": "$intelligence.lowi.regulatory_score"},
                "avg_distributive": {"$avg": "$intelligence.lowi.distributive_score"},
                "avg_redistributive": {"$avg": "$intelligence.lowi.redistributive_score"},
            }
        },
    ]
    rows = [row async for row in collection.aggregate(pipeline)]
    if not rows:
        return LowiAggregateOut(avg_regulatory=0, avg_distributive=0, avg_redistributive=0, sample_size=0)
    row = rows[0]
    return LowiAggregateOut(
        avg_regulatory=row["avg_regulatory"] or 0,
        avg_distributive=row["avg_distributive"] or 0,
        avg_redistributive=row["avg_redistributive"] or 0,
        sample_size=sample_size,
    )


@admin_intelligence_router.post(
    "/items/{item_id}/generate-intelligence", response_model=GenerateQueuedOut, status_code=202
)
async def trigger_item_intelligence(
    item_id: str,
    background_tasks: BackgroundTasks,
    force: bool = False,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    oid = parse_object_id(item_id, "Item not found")
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid}, {"_id": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")

    background_tasks.add_task(generate_intelligence_for_item, db, oid, force)
    return GenerateQueuedOut()


@admin_intelligence_router.post("/intelligence/backfill", response_model=BackfillResultOut)
async def trigger_intelligence_backfill(
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    count = await backfill_missing_intelligence(db, limit=limit)
    return BackfillResultOut(backfilled=count)
