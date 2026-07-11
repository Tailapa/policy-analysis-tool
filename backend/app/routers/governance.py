from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.deps import get_current_admin
from app.core.utils import parse_object_id
from app.schemas.intelligence import BackfillResultOut, GenerateQueuedOut, PolicyIntelligenceOut
from app.schemas.governance import (
    CompareEntryOut,
    CompareGovernanceOut,
    CompareType,
    FingerprintOut,
    GovernanceStatusOut,
    InstrumentMixOut,
    PolicyGovernanceOut,
    TypologyMixOut,
)
from app.services.policy_governance import GENOME_DIMENSIONS, backfill_missing_governance, generate_governance_for_item

item_governance_router = APIRouter(prefix="/api/items", tags=["governance"])
governance_aggregate_router = APIRouter(prefix="/api/governance", tags=["governance"])
admin_governance_router = APIRouter(prefix="/api/admin", tags=["admin", "governance"])


def _governance_out(governance: dict) -> PolicyGovernanceOut:
    out = dict(governance)
    out["generated_at"] = out["generated_at"].isoformat()
    return PolicyGovernanceOut.model_validate(out)


def _intelligence_out(intelligence: dict) -> PolicyIntelligenceOut:
    out = dict(intelligence)
    out["generated_at"] = out["generated_at"].isoformat()
    return PolicyIntelligenceOut.model_validate(out)


@item_governance_router.get("/{item_id}/governance", response_model=GovernanceStatusOut)
async def get_item_governance(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(item_id, "Item not found")
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid}, {"governance": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")

    governance = doc.get("governance")
    if governance is None:
        return GovernanceStatusOut(status="pending", governance=None)

    return GovernanceStatusOut(status="ready", governance=_governance_out(governance))


async def _compute_fingerprint(
    db: AsyncIOMotorDatabase, match: dict, label: str
) -> FingerprintOut:
    collection = db[COLLECTIONS["policy_items"]]
    sample_size = await collection.count_documents(match)

    if sample_size == 0:
        return FingerprintOut(
            label=label,
            avg_genome_vector=[0.0] * len(GENOME_DIMENSIONS),
            genome_dimensions=GENOME_DIMENSIONS,
            avg_wickedness=0.0,
            typology_mix=TypologyMixOut(avg_regulatory=0, avg_distributive=0, avg_redistributive=0),
            instrument_mix=InstrumentMixOut(
                avg_educate=0, avg_persuade=0, avg_coerce=0, avg_strengthen=0, avg_incentivize=0
            ),
            incremental_pct=0.0,
            transformational_pct=0.0,
            stakeholder_diversity=0,
            sample_size=0,
        )

    genome_group = {
        "_id": None,
        "avg_wickedness": {"$avg": "$governance.wickedness.overall_score"},
        "avg_regulatory": {"$avg": "$intelligence.lowi.regulatory_score"},
        "avg_distributive": {"$avg": "$intelligence.lowi.distributive_score"},
        "avg_redistributive": {"$avg": "$intelligence.lowi.redistributive_score"},
        "avg_educate": {"$avg": "$intelligence.engagement.educate_score"},
        "avg_persuade": {"$avg": "$intelligence.engagement.persuade_score"},
        "avg_coerce": {"$avg": "$intelligence.engagement.coerce_score"},
        "avg_strengthen": {"$avg": "$intelligence.engagement.strengthen_score"},
        "avg_incentivize": {"$avg": "$intelligence.engagement.incentivize_score"},
        "incremental_count": {
            "$sum": {"$cond": [{"$gte": ["$intelligence.lindblom.score", 0.5]}, 1, 0]}
        },
        "transformational_count": {
            "$sum": {"$cond": [{"$lt": ["$intelligence.lindblom.score", 0.5]}, 1, 0]}
        },
    }
    for i in range(len(GENOME_DIMENSIONS)):
        genome_group[f"genome_{i}"] = {"$avg": {"$arrayElemAt": ["$governance.genome.vector", i]}}

    pipeline = [{"$match": match}, {"$group": genome_group}]
    rows = [row async for row in collection.aggregate(pipeline)]
    row = rows[0] if rows else {}

    diversity_pipeline = [
        {"$match": match},
        {"$unwind": {"path": "$intelligence.sctp.groups", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": "$intelligence.sctp.groups.group_name"}},
    ]
    diversity_rows = [r async for r in collection.aggregate(diversity_pipeline)]
    stakeholder_diversity = len([r for r in diversity_rows if r["_id"]])

    total_scored = (row.get("incremental_count") or 0) + (row.get("transformational_count") or 0)
    incremental_pct = (row.get("incremental_count", 0) / total_scored * 100) if total_scored else 0.0
    transformational_pct = (
        row.get("transformational_count", 0) / total_scored * 100 if total_scored else 0.0
    )

    return FingerprintOut(
        label=label,
        avg_genome_vector=[row.get(f"genome_{i}") or 0.0 for i in range(len(GENOME_DIMENSIONS))],
        genome_dimensions=GENOME_DIMENSIONS,
        avg_wickedness=row.get("avg_wickedness") or 0.0,
        typology_mix=TypologyMixOut(
            avg_regulatory=row.get("avg_regulatory") or 0,
            avg_distributive=row.get("avg_distributive") or 0,
            avg_redistributive=row.get("avg_redistributive") or 0,
        ),
        instrument_mix=InstrumentMixOut(
            avg_educate=row.get("avg_educate") or 0,
            avg_persuade=row.get("avg_persuade") or 0,
            avg_coerce=row.get("avg_coerce") or 0,
            avg_strengthen=row.get("avg_strengthen") or 0,
            avg_incentivize=row.get("avg_incentivize") or 0,
        ),
        incremental_pct=incremental_pct,
        transformational_pct=transformational_pct,
        stakeholder_diversity=stakeholder_diversity,
        sample_size=sample_size,
    )


@governance_aggregate_router.get("/ministries/{ministry_id}/fingerprint", response_model=FingerprintOut)
async def ministry_fingerprint(ministry_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(ministry_id, "Ministry not found")
    ministry_doc = await db[COLLECTIONS["ministries"]].find_one({"_id": oid})
    if not ministry_doc:
        raise HTTPException(status_code=404, detail="Ministry not found")

    match = {"ministry_id": oid, "governance": {"$ne": None}}
    return await _compute_fingerprint(db, match, ministry_doc["name"])


@governance_aggregate_router.get("/sectors/{pillar}/fingerprint", response_model=FingerprintOut)
async def sector_fingerprint(pillar: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    match = {"pillar": pillar, "governance": {"$ne": None}}
    return await _compute_fingerprint(db, match, pillar)


@governance_aggregate_router.get("/compare", response_model=CompareGovernanceOut)
async def compare_governance(
    type: CompareType = Query(...),
    id_a: str = Query(...),
    id_b: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    async def build_entry(raw_id: str) -> CompareEntryOut:
        if type == "policy":
            oid = parse_object_id(raw_id, "Item not found")
            doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid})
            if not doc:
                raise HTTPException(status_code=404, detail="Item not found")
            return CompareEntryOut(
                id=raw_id,
                label=doc["title"],
                intelligence=_intelligence_out(doc["intelligence"]) if doc.get("intelligence") else None,
                governance=_governance_out(doc["governance"]) if doc.get("governance") else None,
            )
        if type == "ministry":
            oid = parse_object_id(raw_id, "Ministry not found")
            ministry_doc = await db[COLLECTIONS["ministries"]].find_one({"_id": oid})
            if not ministry_doc:
                raise HTTPException(status_code=404, detail="Ministry not found")
            match = {"ministry_id": oid, "governance": {"$ne": None}}
            fingerprint = await _compute_fingerprint(db, match, ministry_doc["name"])
            return CompareEntryOut(id=raw_id, label=ministry_doc["name"], fingerprint=fingerprint)
        # sector
        match = {"pillar": raw_id, "governance": {"$ne": None}}
        fingerprint = await _compute_fingerprint(db, match, raw_id)
        return CompareEntryOut(id=raw_id, label=raw_id, fingerprint=fingerprint)

    entry_a = await build_entry(id_a)
    entry_b = await build_entry(id_b)
    return CompareGovernanceOut(type=type, entry_a=entry_a, entry_b=entry_b)


@admin_governance_router.post(
    "/items/{item_id}/generate-governance", response_model=GenerateQueuedOut, status_code=202
)
async def trigger_item_governance(
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

    background_tasks.add_task(generate_governance_for_item, db, oid, force)
    return GenerateQueuedOut()


@admin_governance_router.post("/governance/backfill", response_model=BackfillResultOut)
async def trigger_governance_backfill(
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    count = await backfill_missing_governance(db, limit=limit)
    return BackfillResultOut(backfilled=count)
