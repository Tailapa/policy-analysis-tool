from typing import Optional

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.utils import parse_object_id
from app.schemas.stats import (
    MapStat,
    MinistryStat,
    MomentumEntry,
    MomentumOut,
    MomentumSeriesPoint,
    PillarStat,
    StatsSummary,
)
from app.services.lookups import get_latest_issue_id, get_ministry_name_map, get_pillar_names

router = APIRouter(prefix="/api/stats", tags=["stats"])

MOMENTUM_WINDOW = 5
MOMENTUM_MINISTRY_CAP = 8


def _ols_slope(values: list[float]) -> float:
    """Closed-form least-squares slope of `values` against their index
    (0..n-1) — pure Python, no numpy needed at this scale (5 points)."""
    n = len(values)
    if n < 2:
        return 0.0
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values))
    denominator = sum((x - mean_x) ** 2 for x in xs)
    return numerator / denominator if denominator else 0.0

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


@router.get("/map", response_model=list[MapStat])
async def stats_map(issue_id: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    match = await _resolve_issue_filter(issue_id, db, default_to_latest=False)
    pipeline = [
        {"$match": {**match, "geography.scope": "state"}},
        {"$unwind": "$geography.states"},
        {"$group": {"_id": "$geography.states", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": 1}}},
    ]
    rows = [row async for row in db[COLLECTIONS["policy_items"]].aggregate(pipeline)]
    return [MapStat(state_code=row["_id"], count=row["count"]) for row in rows]


@router.get("/ministries", response_model=list[MinistryStat])
async def stats_ministries(issue_id: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    match = await _resolve_issue_filter(issue_id, db, default_to_latest=False)
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$ministry_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    rows = [row async for row in db[COLLECTIONS["policy_items"]].aggregate(pipeline)]

    ministries_col = db[COLLECTIONS["ministries"]]
    result = []
    for row in rows:
        ministry_doc = await ministries_col.find_one({"_id": row["_id"]})
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


@router.get("/momentum", response_model=MomentumOut)
async def stats_momentum(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Both requested momentum methods in one response: `delta_pct` (latest
    vs. previous issue) and `trend_slope` (OLS slope across the trailing
    MOMENTUM_WINDOW issues) — the frontend can lead with whichever it wants
    per entry. Themes = all live pillars; ministries = top MOMENTUM_MINISTRY_CAP
    by total volume across the window, matching the engagement-breakdown
    chart's cap for a consistent reading experience."""
    issues_col = db[COLLECTIONS["issues"]]
    issue_docs = [
        doc
        async for doc in issues_col.find({}, {"label": 1, "published_at": 1}).sort("published_at", -1).limit(
            MOMENTUM_WINDOW
        )
    ]
    if not issue_docs:
        return MomentumOut(themes=[], ministries=[], latest_issue_label="", previous_issue_label="")
    issue_docs.reverse()  # oldest -> newest
    issue_ids = [doc["_id"] for doc in issue_docs]
    issue_labels = [doc["label"] for doc in issue_docs]

    collection = db[COLLECTIONS["policy_items"]]

    pillar_pipeline = [
        {"$match": {"issue_id": {"$in": issue_ids}}},
        {"$group": {"_id": {"issue_id": "$issue_id", "pillar": "$pillar"}, "count": {"$sum": 1}}},
    ]
    pillar_counts: dict[str, dict] = {}
    async for row in collection.aggregate(pillar_pipeline):
        pillar_counts.setdefault(row["_id"]["pillar"], {})[str(row["_id"]["issue_id"])] = row["count"]

    ministry_pipeline = [
        {"$match": {"issue_id": {"$in": issue_ids}}},
        {"$group": {"_id": {"issue_id": "$issue_id", "ministry_id": "$ministry_id"}, "count": {"$sum": 1}}},
    ]
    ministry_counts: dict[str, dict] = {}
    async for row in collection.aggregate(ministry_pipeline):
        key = str(row["_id"]["ministry_id"])
        ministry_counts.setdefault(key, {})[str(row["_id"]["issue_id"])] = row["count"]

    def _build_entry(label: str, counts_by_issue: dict) -> MomentumEntry:
        series = [
            MomentumSeriesPoint(issue_label=issue_labels[i], count=counts_by_issue.get(str(issue_ids[i]), 0))
            for i in range(len(issue_ids))
        ]
        values = [p.count for p in series]
        latest_count = values[-1]
        previous_count = values[-2] if len(values) >= 2 else 0
        delta_pct = (
            ((latest_count - previous_count) / previous_count * 100) if previous_count else None
        )
        return MomentumEntry(
            label=label,
            latest_count=latest_count,
            previous_count=previous_count,
            delta_pct=delta_pct,
            trend_slope=_ols_slope([float(v) for v in values]),
            series=series,
        )

    pillars = await get_pillar_names(db)
    themes = [_build_entry(pillar, pillar_counts.get(pillar, {})) for pillar in pillars]

    ministry_names = await get_ministry_name_map(db)
    ministry_entries = [
        _build_entry(ministry_names.get(mid, "Unknown Ministry"), counts) for mid, counts in ministry_counts.items()
    ]
    ministry_entries.sort(key=lambda e: sum(p.count for p in e.series), reverse=True)
    ministries = ministry_entries[:MOMENTUM_MINISTRY_CAP]

    return MomentumOut(
        themes=themes,
        ministries=ministries,
        latest_issue_label=issue_labels[-1],
        previous_issue_label=issue_labels[-2] if len(issue_labels) >= 2 else "",
    )
