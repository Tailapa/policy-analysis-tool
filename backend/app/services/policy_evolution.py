"""Policy Evolution: clusters semantically related items from the dashboard's
own dataset (via embedding similarity), then enriches each cluster with a
Serper-grounded LLM synthesis tracing the theme's real-world genealogy
(prior schemes, laws, court verdicts) beyond what the dashboard's own
~100-item, few-month window can show on its own — e.g. electric mobility ->
FAME -> battery storage -> PLI -> critical minerals -> EV charging.

Admin-triggered and cached (see routers/evolution.py) — this involves web
search + LLM synthesis per cluster, too slow/costly to compute on every
page view.
"""

import logging
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS
from app.schemas.evolution import EvolutionSynthesisResult
from app.services.llm_structured import active_model_name, generate_structured
from app.services.lookups import get_ministry_name_map
from app.services.research import format_research_context, run_research_phase

logger = logging.getLogger(__name__)

CLUSTER_SIMILARITY_THRESHOLD = 0.78
MIN_CLUSTER_SIZE = 3
TOP_N_CLUSTERS = 3
ITEM_EVOLUTION_SIMILARITY_THRESHOLD = 0.72


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0


def _cluster_items(items: list[dict]) -> list[list[dict]]:
    """Single-linkage clustering over embeddings via union-find — an item
    joins a cluster if it's similar enough to ANY existing member,
    transitively. Pure Python; O(n^2) pairwise comparisons is fine at the
    ~100-item scale this dashboard operates at (no numpy in this venv)."""
    n = len(items)
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for i in range(n):
        for j in range(i + 1, n):
            if _cosine_similarity(items[i]["embedding"], items[j]["embedding"]) >= CLUSTER_SIMILARITY_THRESHOLD:
                union(i, j)

    groups: dict[int, list[dict]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(items[i])

    clusters = [
        sorted(group, key=lambda it: it["item_date"])
        for group in groups.values()
        if len(group) >= MIN_CLUSTER_SIZE
    ]
    clusters.sort(key=len, reverse=True)
    return clusters


def _build_research_planning_prompt(dashboard_items: list[dict]) -> str:
    items_desc = "\n".join(
        f"- {it['item_date']}: {it['title']} ({it['ministry_name']}, {it['pillar']})" for it in dashboard_items
    )
    return f"""The following recently-tracked Indian government policy items appear to belong to the same \
broader policy theme (grouped by semantic similarity):

{items_desc}

Decide what web searches would help trace this theme's real-world genealogy — the prior schemes, laws, \
budget announcements, or court verdicts that led up to these recent developments, beyond what's listed \
above. Call web_search with up to 3 well-targeted queries aimed at finding that earlier history. If you \
can't identify a coherent theme to research, don't call the tool — just say so briefly."""


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

2. stages: an ordered list (chronological, earliest first) of 4-8 stages tracing this theme's genealogy. \
Each stage needs: label (short, e.g. "FAME Scheme (2015)"), year (approximate year or range), description \
(1-2 sentences), source ("dashboard" if it corresponds to one of the tracked items above — in which case \
set item_id to that item's item_id exactly as given — or "research" if it's real-world history found via \
the web research above, in which case leave item_id unset). Every dashboard item listed above should \
appear as its own stage; research-sourced stages should fill in the real history BEFORE them.

3. synthesis: a ~120-150 word narrative tying the whole genealogy together — how the theme evolved, what \
drove each transition, and where it's heading.

If the web research above found nothing useful, build the timeline from the dashboard items alone and say \
so in the synthesis rather than inventing historical stages.

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


async def _generate_chain(dashboard_items: list[dict]) -> dict | None:
    """Shared research+synthesis step used by both the cross-policy cluster
    path and the per-item path below — the only difference between them is
    how `dashboard_items` gets assembled."""
    planning_prompt = _build_research_planning_prompt(dashboard_items)
    research_records = await run_research_phase(planning_prompt)
    research_context = format_research_context(research_records)

    synthesis_prompt = _build_synthesis_prompt(dashboard_items, research_context)
    result = await generate_structured(synthesis_prompt, EvolutionSynthesisResult)
    if result is None:
        return None

    sources = [
        {"title": r["title"], "url": r["url"], "snippet": r["snippet"], "query": record["query"]}
        for record in research_records
        for r in record["results"]
    ]

    return {
        "theme_label": result.theme_label,
        "stages": [s.model_dump() for s in result.stages],
        "synthesis": result.synthesis,
        "sources": sources,
        "generated_at": datetime.now(timezone.utc),
        "model": active_model_name(),
    }


async def generate_policy_evolution(db: AsyncIOMotorDatabase, top_n: int = TOP_N_CLUSTERS) -> int:
    """Admin-triggered: clusters embedded items, runs research+synthesis for
    the top N clusters, and replaces whatever was cached before (full
    replace, not incremental — regeneration is meant to reflect the current
    dataset, not accumulate stale chains). Returns how many chains were
    generated."""
    cursor = db[COLLECTIONS["policy_items"]].find(
        {"embedding": {"$ne": None}},
        {"title": 1, "description": 1, "ministry_id": 1, "pillar": 1, "item_date": 1, "embedding": 1},
    )
    items = [doc async for doc in cursor]
    if len(items) < MIN_CLUSTER_SIZE:
        return 0

    clusters = _cluster_items(items)[:top_n]
    if not clusters:
        return 0

    ministry_names = await get_ministry_name_map(db)
    chains = []

    for cluster in clusters:
        chain = await _generate_chain(_dashboard_items_payload(cluster, ministry_names))
        if chain:
            chains.append(chain)

    if chains:
        await db[COLLECTIONS["policy_evolution"]].delete_many({})
        await db[COLLECTIONS["policy_evolution"]].insert_many(chains)

    return len(chains)


async def generate_item_evolution(db: AsyncIOMotorDatabase, item_id, force: bool = False) -> None:
    """Per-item genealogy timeline — same research+synthesis machinery as
    generate_policy_evolution above, but scoped to one item's semantic
    neighborhood (its embedding's nearest matches, not a dataset-wide
    cluster) and stored on the item itself (policy_items.evolution) rather
    than the shared policy_evolution collection.

    Deliberately admin-triggered rather than auto-generated on publish: it
    depends on the item already having an embedding, which is itself
    generated by a separate concurrent best-effort background task at
    publish time — triggering evolution generation in that same batch would
    race it and usually no-op before the embedding exists. By the time an
    admin clicks 'generate' on the item's Governance tab, the embedding will
    already be there."""
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": item_id})
    if not doc:
        return
    if doc.get("evolution") is not None and not force:
        return
    if doc.get("embedding") is None:
        return

    cursor = db[COLLECTIONS["policy_items"]].find(
        {"_id": {"$ne": item_id}, "embedding": {"$ne": None}},
        {"title": 1, "ministry_id": 1, "pillar": 1, "item_date": 1, "embedding": 1},
    )
    candidates = [c async for c in cursor]
    neighbors = [
        c
        for c in candidates
        if _cosine_similarity(doc["embedding"], c["embedding"]) >= ITEM_EVOLUTION_SIMILARITY_THRESHOLD
    ]

    cluster = neighbors + [doc]
    cluster.sort(key=lambda c: c["item_date"])

    ministry_names = await get_ministry_name_map(db)
    chain = await _generate_chain(_dashboard_items_payload(cluster, ministry_names))
    if chain is None:
        return

    await db[COLLECTIONS["policy_items"]].update_one({"_id": item_id}, {"$set": {"evolution": chain}})


async def backfill_missing_item_evolution(db: AsyncIOMotorDatabase, limit: int = 100) -> int:
    """Admin-triggered retry job: fills in evolution=null items that already
    have an embedding. Mirrors backfill_missing_governance's contract."""
    cursor = db[COLLECTIONS["policy_items"]].find({"evolution": None, "embedding": {"$ne": None}}).limit(limit)
    count = 0
    async for doc in cursor:
        await generate_item_evolution(db, doc["_id"])
        after = await db[COLLECTIONS["policy_items"]].find_one({"_id": doc["_id"]}, {"evolution": 1})
        if after and after.get("evolution") is not None:
            count += 1
    return count
