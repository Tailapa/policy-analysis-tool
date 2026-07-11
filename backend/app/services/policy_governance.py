import logging
from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS
from app.schemas.governance import PolicyGovernanceResult, SynthesisResult
from app.services.governance_frameworks import (
    build_governance_prompt,
    build_governance_research_planning_prompt,
    build_synthesis_prompt,
)
from app.services.llm_structured import active_model_name, generate_structured
from app.services.research import format_research_context, run_research_phase
from app.services.scoring import clamp01

logger = logging.getLogger(__name__)

# Fixed order/labels for the Governance Genome's ten dimensions — see
# _compute_genome for the derivation of each. Exposed so routers/frontend
# code can rely on a stable ordering without recomputing it.
GENOME_DIMENSIONS = [
    "Regulatory",
    "Redistributive",
    "Coercive",
    "Incentive",
    "Capacity Building",
    "Incrementalism",
    "Power Concentration",
    "Wickedness",
    "Problem Stream",
    "Politics Stream",
]

CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}
RANK_CONFIDENCE = {v: k for k, v in CONFIDENCE_RANK.items()}


def _clamp_result(result: PolicyGovernanceResult) -> PolicyGovernanceResult:
    """Same defensive-clamp discipline as policy_intelligence.py's
    _clamp_result — structured-output score fields aren't reliably
    range-enforced by the SDK."""
    streams = result.streams
    streams.problem_score = max(0.0, min(5.0, streams.problem_score))
    streams.policy_score = max(0.0, min(5.0, streams.policy_score))
    streams.politics_score = max(0.0, min(5.0, streams.politics_score))

    for entrepreneur in result.entrepreneurs.entrepreneurs:
        entrepreneur.influence = clamp01(entrepreneur.influence)

    dims = result.wickedness.dimensions
    dims.implementation_complexity = clamp01(dims.implementation_complexity)
    dims.political_conflict = clamp01(dims.political_conflict)
    dims.federal_coordination = clamp01(dims.federal_coordination)
    dims.scientific_uncertainty = clamp01(dims.scientific_uncertainty)
    dims.behaviour_change = clamp01(dims.behaviour_change)
    dims.time_horizon = clamp01(dims.time_horizon)
    dims.cross_sector = clamp01(dims.cross_sector)

    return result


def _wickedness_overall(result: PolicyGovernanceResult) -> float:
    dims = result.wickedness.dimensions
    values = [
        dims.implementation_complexity,
        dims.political_conflict,
        dims.federal_coordination,
        dims.scientific_uncertainty,
        dims.behaviour_change,
        dims.time_horizon,
        dims.cross_sector,
    ]
    return round((sum(values) / len(values)) * 100, 1)


def _min_confidence(levels: list[str]) -> str:
    if not levels:
        return "medium"
    worst = min(CONFIDENCE_RANK.get(level, 1) for level in levels)
    return RANK_CONFIDENCE[worst]


def _compute_genome(
    result: PolicyGovernanceResult, wickedness_overall: float, intelligence: dict | None
) -> dict:
    """Deterministic — computed only after the governance LLM call (step 5)
    resolves, and reads the item's existing `intelligence` subdocument if
    present. Never LLM-generated: this is the same "never trust the LLM to
    keep a derived field consistent with its own component scores" lesson
    that motivated the SCTP quadrant fix, taken to its logical conclusion —
    the genome IS a derived field, so it's computed in code, not asked for.

    If `intelligence` is None (the 6-framework layer hasn't run yet for this
    item — the two pipelines are decoupled per the PRD), dimensions sourced
    from it default to the neutral midpoint 0.5 and the reasoning says so
    explicitly rather than silently guessing."""
    missing_intelligence = intelligence is None

    if missing_intelligence:
        regulatory = redistributive = coerce = incentivize = strengthen = 0.5
        incrementalism = 0.5
        power_concentration = 0.5
        intel_confidences: list[str] = []
    else:
        lowi = intelligence.get("lowi", {})
        engagement = intelligence.get("engagement", {})
        lindblom = intelligence.get("lindblom", {})
        sctp_groups = intelligence.get("sctp", {}).get("groups", [])

        regulatory = lowi.get("regulatory_score", 0.5)
        redistributive = lowi.get("redistributive_score", 0.5)
        coerce = engagement.get("coerce_score", 0.5)
        incentivize = engagement.get("incentivize_score", 0.5)
        strengthen = engagement.get("strengthen_score", 0.5)
        incrementalism = lindblom.get("score", 0.5)
        power_concentration = (
            sum(g.get("power_score", 0.5) for g in sctp_groups) / len(sctp_groups)
            if sctp_groups
            else 0.5
        )
        intel_confidences = [
            lowi.get("confidence", "medium"),
            engagement.get("confidence", "medium"),
            lindblom.get("confidence", "medium"),
        ]

    vector = [
        regulatory,
        redistributive,
        coerce,
        incentivize,
        strengthen,
        incrementalism,
        power_concentration,
        wickedness_overall / 100,
        result.streams.problem_score / 5,
        result.streams.politics_score / 5,
    ]

    # Auto-compose reasoning by naming the 1-2 dimensions furthest from the
    # neutral midpoint (0.5) — not LLM-written, a template over the numbers.
    ranked = sorted(
        zip(GENOME_DIMENSIONS, vector), key=lambda pair: abs(pair[1] - 0.5), reverse=True
    )
    top = ranked[:2]
    top_desc = " and ".join(f"{label.lower()} ({value:.2f})" for label, value in top)
    reasoning = f"Dominated by {top_desc}, computed from this item's Lowi/Engagement/Lindblom/SCTP and Streams/Wickedness readings."
    if missing_intelligence:
        reasoning += (
            " The 6-framework Policy Intelligence layer hasn't generated for this item yet, so "
            "regulatory, redistributive, coercive, incentive, capacity-building, incrementalism, and "
            "power-concentration dimensions default to a neutral 0.5 rather than being guessed."
        )

    confidence = _min_confidence(
        [
            result.streams.confidence,
            result.punctuated_equilibrium.confidence,
            result.wickedness.confidence,
            *intel_confidences,
        ]
    )

    return {
        "vector": vector,
        "dimensions": GENOME_DIMENSIONS,
        "reasoning": reasoning,
        "confidence": confidence,
    }


async def generate_governance_for_item(
    db: AsyncIOMotorDatabase, item_id: ObjectId, force: bool = False
) -> None:
    """Post-publish, best-effort — mirrors generate_intelligence_for_item's
    contract exactly (never raises, decoupled from publish, cached unless
    force=True). Runs independently of the 6-framework intelligence
    pipeline; only the Governance Genome step reads intelligence data if
    it's already there, and degrades gracefully (not blockingly) if not."""
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": item_id})
    if not doc:
        return
    if doc.get("governance") is not None and not force:
        return

    ministry_doc = await db[COLLECTIONS["ministries"]].find_one({"_id": doc["ministry_id"]})
    ministry_name = ministry_doc["name"] if ministry_doc else "Unknown Ministry"

    planning_prompt = build_governance_research_planning_prompt(
        title=doc["title"], description=doc["description"], ministry_name=ministry_name, pillar=doc["pillar"]
    )
    research_records = await run_research_phase(planning_prompt)
    research_context = format_research_context(research_records)

    prompt = build_governance_prompt(
        title=doc["title"],
        description=doc["description"],
        ministry_name=ministry_name,
        pillar=doc["pillar"],
        tags=doc.get("tags", []),
        research_context=research_context,
    )

    result = await generate_structured(prompt, PolicyGovernanceResult)
    if result is None:
        return
    result = _clamp_result(result)

    wickedness_overall = _wickedness_overall(result)
    genome = _compute_genome(result, wickedness_overall, doc.get("intelligence"))

    sources = [
        {"title": item["title"], "url": item["url"], "snippet": item["snippet"], "query": record["query"]}
        for record in research_records
        for item in record["results"]
    ]

    result_dict = result.model_dump()
    result_dict["wickedness"]["overall_score"] = wickedness_overall

    # Follow-up call: needs the computed genome + (possibly) the intelligence
    # doc + the numbered source list, none of which exist before this point.
    # Best-effort — falls back to empty strings rather than failing the
    # whole generation if this call doesn't come back.
    synthesis_prompt = build_synthesis_prompt(
        title=doc["title"],
        description=doc["description"],
        ministry_name=ministry_name,
        pillar=doc["pillar"],
        governance_result=result_dict,
        intelligence_doc=doc.get("intelligence"),
        genome=genome,
        sources=sources,
    )
    synthesis = await generate_structured(synthesis_prompt, SynthesisResult)
    genome["brief"] = synthesis.genome_brief if synthesis else ""
    research_brief = synthesis.research_brief if synthesis else ""
    synthesis_conclusion = synthesis.synthesis_conclusion if synthesis else ""

    governance_doc = {
        "generated_at": datetime.now(timezone.utc),
        "model": active_model_name(),
        "sources": sources,
        "genome": genome,
        "research_brief": research_brief,
        "synthesis_conclusion": synthesis_conclusion,
        **result_dict,
    }

    await db[COLLECTIONS["policy_items"]].update_one(
        {"_id": item_id}, {"$set": {"governance": governance_doc}}
    )


async def backfill_missing_governance(db: AsyncIOMotorDatabase, limit: int = 100) -> int:
    """Admin-triggered retry job: fills in governance=null items. Returns how
    many were successfully backfilled. Mirrors backfill_missing_intelligence."""
    cursor = db[COLLECTIONS["policy_items"]].find({"governance": None}).limit(limit)
    count = 0
    async for doc in cursor:
        await generate_governance_for_item(db, doc["_id"])
        after = await db[COLLECTIONS["policy_items"]].find_one(
            {"_id": doc["_id"]}, {"governance": 1}
        )
        if after and after.get("governance") is not None:
            count += 1
    return count
