import logging
from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS
from app.schemas.intelligence import PolicyIntelligenceResult
from app.services.llm_structured import active_model_name, generate_structured
from app.services.policy_frameworks import build_intelligence_prompt, build_research_planning_prompt
from app.services.research import format_research_context, run_research_phase
from app.services.scoring import clamp01

logger = logging.getLogger(__name__)


def _derive_quadrant(power_score: float, construction_score: float) -> str:
    """The prompt asks the model to derive quadrant from its own two scores,
    but structured-output models don't reliably keep a free-text-adjacent
    label field consistent with two separate numeric fields — so a group can
    come back e.g. power=0.7 (high) but quadrant="advantaged" (which requires
    low power), which then plots on the high-power side of the chart while
    rendering with the advantaged color/label. Recompute the label from the
    scores ourselves so the stored quadrant can never disagree with the
    coordinates it's plotted at, using the same power>=0.5 / construction>=0.5
    convention documented in policy_frameworks.py."""
    high_power = power_score >= 0.5
    positive_construction = construction_score >= 0.5
    if high_power and positive_construction:
        return "contender"
    if not high_power and positive_construction:
        return "advantaged"
    if not high_power and not positive_construction:
        return "dependent"
    return "deviant"


def _clamp_result(result: PolicyIntelligenceResult) -> PolicyIntelligenceResult:
    """Structured-output score fields aren't reliably range-enforced by the
    SDK — clamp defensively rather than trust the model's numbers."""
    lowi = result.lowi
    lowi.regulatory_score = clamp01(lowi.regulatory_score)
    lowi.distributive_score = clamp01(lowi.distributive_score)
    lowi.redistributive_score = clamp01(lowi.redistributive_score)

    for group in result.sctp.groups:
        group.power_score = clamp01(group.power_score)
        group.construction_score = clamp01(group.construction_score)
        group.quadrant = _derive_quadrant(group.power_score, group.construction_score)

    eng = result.engagement
    eng.educate_score = clamp01(eng.educate_score)
    eng.persuade_score = clamp01(eng.persuade_score)
    eng.coerce_score = clamp01(eng.coerce_score)
    eng.strengthen_score = clamp01(eng.strengthen_score)
    eng.incentivize_score = clamp01(eng.incentivize_score)

    result.lindblom.score = clamp01(result.lindblom.score)
    return result


async def generate_intelligence_for_item(
    db: AsyncIOMotorDatabase, item_id: ObjectId, force: bool = False
) -> None:
    """Post-publish, best-effort. Never raises — a failure here must not
    affect the publish flow that already happened, matching
    generate_embedding_for_item's contract. intelligence stays null until a
    retry (backfill_missing_intelligence) picks it up again.

    Cached by default: once intelligence exists for an item, this is a no-op
    unless force=True — generation costs real tokens/billing, so callers
    (upload, manual-create, backfill) never pay for it twice. Pass
    force=True only for an explicit admin-initiated regeneration."""
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": item_id})
    if not doc:
        return
    if doc.get("intelligence") is not None and not force:
        return

    ministry_doc = await db[COLLECTIONS["ministries"]].find_one({"_id": doc["ministry_id"]})
    ministry_name = ministry_doc["name"] if ministry_doc else "Unknown Ministry"

    planning_prompt = build_research_planning_prompt(
        title=doc["title"], description=doc["description"], ministry_name=ministry_name, pillar=doc["pillar"]
    )
    research_records = await run_research_phase(planning_prompt)
    research_context = format_research_context(research_records)

    prompt = build_intelligence_prompt(
        title=doc["title"],
        description=doc["description"],
        ministry_name=ministry_name,
        pillar=doc["pillar"],
        tags=doc.get("tags", []),
        research_context=research_context,
    )

    result = await generate_structured(prompt, PolicyIntelligenceResult)
    if result is None:
        return
    result = _clamp_result(result)

    sources = [
        {"title": item["title"], "url": item["url"], "snippet": item["snippet"], "query": record["query"]}
        for record in research_records
        for item in record["results"]
    ]

    intelligence_doc = {
        "generated_at": datetime.now(timezone.utc),
        "model": active_model_name(),
        "sources": sources,
        **result.model_dump(),
    }

    await db[COLLECTIONS["policy_items"]].update_one(
        {"_id": item_id}, {"$set": {"intelligence": intelligence_doc}}
    )


async def backfill_missing_intelligence(db: AsyncIOMotorDatabase, limit: int = 100) -> int:
    """Admin-triggered retry job: fills in intelligence=null items. Returns
    how many were successfully backfilled."""
    cursor = db[COLLECTIONS["policy_items"]].find({"intelligence": None}).limit(limit)
    count = 0
    async for doc in cursor:
        await generate_intelligence_for_item(db, doc["_id"])
        after = await db[COLLECTIONS["policy_items"]].find_one(
            {"_id": doc["_id"]}, {"intelligence": 1}
        )
        if after and after.get("intelligence") is not None:
            count += 1
    return count
