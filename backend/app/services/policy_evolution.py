"""Per-item Policy Evolution: for a newly-ingested item, finds semantically
related items from *earlier* issues (via embedding similarity) — i.e. only
policies already tracked from previously-uploaded PDFs, never live web
search — and asks the LLM to synthesize a short genealogy timeline from
those matches alone. Stored on the item itself (policy_items.evolution).

If no qualifying earlier-issue relatives are found, `evolution` is left
unset entirely — the frontend section only renders when there's something
to show, per the "only from the PDFs I've uploaded" requirement.

Auto-triggered right after a new item's embedding is generated (see
generate_embedding_then_evolution, queued from routers/admin_uploads.py) —
never on manual single-item creation, and never backfilled for
already-ingested items.
"""

import logging
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS
from app.schemas.evolution import EvolutionSynthesisResult
from app.services.embeddings import generate_embedding_for_item
from app.services.llm_structured import active_model_name, generate_structured
from app.services.lookups import get_ministry_name_map

logger = logging.getLogger(__name__)

ITEM_EVOLUTION_SIMILARITY_THRESHOLD = 0.72


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0


def _build_synthesis_prompt(dashboard_items: list[dict], research_context: str) -> str:
    items_desc = "\n".join(
        f"- item_id={it['item_id']}, {it['item_date']}: {it['title']} ({it['ministry_name']}, {it['pillar']})"
        for it in dashboard_items
    )
    research_block = f"\n{research_context}\n" if research_context else "\n(no web research available)\n"
    return f"""You are a public policy analyst tracing the genealogy of a policy theme for an Indian \
governance dashboard.

RECENTLY TRACKED DASHBOARD ITEMS (same semantic cluster, chronological)
{items_desc}
{research_block}
Produce an ordered policy evolution timeline for this theme:

1. theme_label: a short (3-6 word) name for the overarching theme these items belong to (e.g. "Electric \
Mobility & Battery Storage", "Bullion Trade Regulation").

2. stages: an ordered list (chronological, earliest first) of stages tracing this theme's genealogy, one \
per dashboard item listed above. Each stage needs: label (short, e.g. "FAME Scheme (2015)"), year (the \
month and year, e.g. "Jan 2015" — use the dashboard item's own date above for dashboard-sourced stages; \
fall back to a year-only or range, e.g. "2019-2022", only when a specific month genuinely isn't derivable), \
description (1-2 sentences), source ("dashboard" in every case here), and item_id set to that item's \
item_id exactly as given.

3. synthesis: a ~120-150 word narrative tying the whole genealogy together — how the theme evolved across \
these tracked items, what drove each transition, and where it's heading.

Build the timeline strictly from the dashboard items listed above — do not invent historical stages or \
facts beyond what's given.

Return your answer as JSON matching the required schema exactly."""


def _dashboard_items_payload(cluster: list[dict], ministry_names: dict[str, str]) -> list[dict]:
    return [
        {
            "item_id": str(it["_id"]),
            "title": it["title"],
            "item_date": it["item_date"].isoformat(),
            "ministry_name": ministry_names.get(str(it["ministry_id"]), "Unknown Ministry"),
            "pillar": it["pillar"],
        }
        for it in cluster
    ]


async def _generate_chain_from_items(dashboard_items: list[dict]) -> dict | None:
    """PDF-only synthesis — no Serper research phase, so every stage is
    grounded in an actual tracked item, never invented web history."""
    synthesis_prompt = _build_synthesis_prompt(dashboard_items, research_context="")
    result = await generate_structured(synthesis_prompt, EvolutionSynthesisResult)
    if result is None:
        return None

    return {
        "theme_label": result.theme_label,
        "stages": [s.model_dump() for s in result.stages],
        "synthesis": result.synthesis,
        "sources": [],
        "generated_at": datetime.now(timezone.utc),
        "model": active_model_name(),
    }


async def generate_item_evolution(db: AsyncIOMotorDatabase, item_id, force: bool = False) -> None:
    """Matches this item against other PDF-ingested items from strictly
    *earlier* issues (item_date < this item's item_date — all items in one
    issue share the issue's period_start as item_date, so this is equivalent
    to "an earlier edition") within cosine-similarity range of its
    embedding. If none qualify, leaves `evolution` unset rather than storing
    an empty/placeholder chain."""
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": item_id})
    if not doc:
        return
    if doc.get("evolution") is not None and not force:
        return
    if doc.get("embedding") is None:
        return

    cursor = db[COLLECTIONS["policy_items"]].find(
        {"_id": {"$ne": item_id}, "embedding": {"$ne": None}, "item_date": {"$lt": doc["item_date"]}},
        {"title": 1, "ministry_id": 1, "pillar": 1, "item_date": 1, "embedding": 1},
    )
    candidates = [c async for c in cursor]
    neighbors = [
        c
        for c in candidates
        if _cosine_similarity(doc["embedding"], c["embedding"]) >= ITEM_EVOLUTION_SIMILARITY_THRESHOLD
    ]
    if not neighbors:
        return

    cluster = neighbors + [doc]
    cluster.sort(key=lambda c: c["item_date"])

    ministry_names = await get_ministry_name_map(db)
    chain = await _generate_chain_from_items(_dashboard_items_payload(cluster, ministry_names))
    if chain is None:
        return

    await db[COLLECTIONS["policy_items"]].update_one({"_id": item_id}, {"$set": {"evolution": chain}})


async def generate_embedding_then_evolution(db: AsyncIOMotorDatabase, item_id) -> None:
    """Evolution matching needs the item's embedding to exist first — chains
    the two as one background task instead of racing two independent ones
    (see generate_item_evolution's docstring for why the race matters)."""
    await generate_embedding_for_item(db, item_id)
    await generate_item_evolution(db, item_id)


async def backfill_missing_item_evolution(db: AsyncIOMotorDatabase, limit: int = 100) -> int:
    """Admin-triggered retry job: (re-)attempts evolution generation for
    items that have an embedding but no evolution yet — a no-op for items
    with genuinely no earlier-issue relatives, since generate_item_evolution
    just leaves those unset again."""
    cursor = db[COLLECTIONS["policy_items"]].find({"evolution": None, "embedding": {"$ne": None}}).limit(limit)
    count = 0
    async for doc in cursor:
        await generate_item_evolution(db, doc["_id"])
        after = await db[COLLECTIONS["policy_items"]].find_one({"_id": doc["_id"]}, {"evolution": 1})
        if after and after.get("evolution") is not None:
            count += 1
    return count
