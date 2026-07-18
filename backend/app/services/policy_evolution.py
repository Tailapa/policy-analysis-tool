"""Per-item Policy Evolution: for a newly-ingested item, finds textually
related items from *earlier* issues — i.e. only policies already tracked
from previously-uploaded PDFs, never live web search — and builds a short
genealogy timeline from those matches alone. Stored on the item itself
(policy_items.evolution).

Similarity is TF-IDF cosine similarity over each item's title+description
(the pre-embedding, industry-standard technique for document similarity) —
no AI model, no external API call, fully deterministic. theme_label/stages/
synthesis are built with templates directly from the matched items' own
data (title, date, ministry, pillar), not generated text.

If no qualifying earlier-issue relatives are found, `evolution` is left
unset entirely — the frontend section only renders when there's something
to show, per the "only from the PDFs I've uploaded" requirement.

Auto-triggered right after a new item is ingested (see
routers/admin_uploads.py) — never on manual single-item creation, and never
backfilled for already-ingested items unless explicitly requested.
"""

import math
import re
from collections import Counter
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS
from app.services.lookups import get_ministry_name_map

ITEM_EVOLUTION_SIMILARITY_THRESHOLD = 0.2
EVOLUTION_METHOD = "tfidf-keyword-match-v1"

TOKEN_RE = re.compile(r"[a-z]{3,}")

# Common English stopwords plus a few domain-generic terms (ministry,
# government, india, ...) that would otherwise dominate every document's
# vector and swamp genuine thematic overlap.
STOPWORDS = frozenset(
    """
    the a an and or but if then else for nor so yet of to in on at by with
    from into onto over under again further once here there when where why
    how all any both each few more most other some such no not only own
    same than too very can will just should now this that these those is
    are was were be been being have has had do does did shall would could
    might must its it as also which who whom their they them his her he
    she we you your our ministry ministries government india indian union
    central state states national scheme schemes policy policies programme
    program initiative announced launched approved notified issued crore
    lakh rs inr
    """.split()
)


def _tokenize(text: str) -> list[str]:
    return [w for w in TOKEN_RE.findall(text.lower()) if w not in STOPWORDS]


def _tf(tokens: list[str]) -> dict[str, float]:
    if not tokens:
        return {}
    counts = Counter(tokens)
    total = len(tokens)
    return {term: count / total for term, count in counts.items()}


def _idf(token_lists: list[list[str]]) -> dict[str, float]:
    n_docs = len(token_lists) or 1
    df: Counter = Counter()
    for tokens in token_lists:
        df.update(set(tokens))
    return {term: math.log((n_docs + 1) / (count + 1)) + 1 for term, count in df.items()}

Vector = dict[str, float]


def _tfidf_vector(tokens: list[str], idf: dict[str, float]) -> Vector:
    return {term: freq * idf.get(term, 0.0) for term, freq in _tf(tokens).items()}


def _cosine_similarity(a: Vector, b: Vector) -> float:
    shared = set(a) & set(b)
    if not shared:
        return 0.0
    dot = sum(a[t] * b[t] for t in shared)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0


def _item_text(doc: dict) -> str:
    return f"{doc['title']} {doc['description']}"


def _format_stage_year(item_date: datetime) -> str:
    return item_date.strftime("%b %Y")


def _build_theme_label(cluster: list[dict], cluster_tokens: list[list[str]]) -> str:
    """Picks the 2-3 most cluster-distinctive keywords (highest combined
    TF-IDF weight across the cluster, scored against the cluster itself so
    generic-but-locally-frequent terms surface) and title-cases them into a
    short label. Falls back to the newest item's own title if nothing
    stands out (e.g. a 2-item cluster with almost no shared vocabulary)."""
    idf = _idf(cluster_tokens)
    combined: Counter = Counter()
    for tokens in cluster_tokens:
        vector = _tfidf_vector(tokens, idf)
        for term, weight in vector.items():
            combined[term] += weight

    top_terms = [term for term, _ in combined.most_common(3)]
    if not top_terms:
        return cluster[-1]["title"][:60]
    return " ".join(word.capitalize() for word in top_terms)


def _build_stages(dashboard_items: list[dict]) -> list[dict]:
    return [
        {
            "label": it["title"] if len(it["title"]) <= 60 else it["title"][:57] + "…",
            "year": _format_stage_year(it["item_date"]),
            "description": it["description"][:150] + ("…" if len(it["description"]) > 150 else ""),
            "source": "dashboard",
            "item_id": it["item_id"],
        }
        for it in dashboard_items
    ]


def _join_list(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " and " + items[-1]


def _build_synthesis(dashboard_items: list[dict]) -> str:
    first, last = dashboard_items[0], dashboard_items[-1]
    ministries = sorted({it["ministry_name"] for it in dashboard_items})
    pillars = sorted({it["pillar"] for it in dashboard_items})

    summary = (
        f'This theme has been tracked across {len(dashboard_items)} editions of this dashboard, '
        f'beginning with "{first["title"]}" ({_format_stage_year(first["item_date"])}, {first["ministry_name"]}) '
        f'and most recently "{last["title"]}" ({_format_stage_year(last["item_date"])}, {last["ministry_name"]}).'
    )
    involvement = f" It has involved {_join_list(ministries)}, spanning the {_join_list(pillars)} pillar{'s' if len(pillars) > 1 else ''}."
    return summary + involvement


def _dashboard_items_payload(cluster: list[dict], ministry_names: dict[str, str]) -> list[dict]:
    return [
        {
            "item_id": str(it["_id"]),
            "title": it["title"],
            "description": it["description"],
            "item_date": it["item_date"],
            "ministry_name": ministry_names.get(str(it["ministry_id"]), "Unknown Ministry"),
            "pillar": it["pillar"],
        }
        for it in cluster
    ]


def _build_chain_from_items(dashboard_items: list[dict], cluster_tokens: list[list[str]]) -> dict:
    """PDF-only, template-driven synthesis — every stage is grounded in an
    actual tracked item, never invented or generated history."""
    return {
        "theme_label": _build_theme_label(dashboard_items, cluster_tokens),
        "stages": _build_stages(dashboard_items),
        "synthesis": _build_synthesis(dashboard_items),
        "generated_at": datetime.now(timezone.utc),
        "method": EVOLUTION_METHOD,
    }


async def generate_item_evolution(db: AsyncIOMotorDatabase, item_id, force: bool = False) -> None:
    """Matches this item against other PDF-ingested items from strictly
    *earlier* issues (item_date < this item's item_date — all items in one
    issue share the issue's period_start as item_date, so this is equivalent
    to "an earlier edition") within TF-IDF cosine-similarity range of its
    own title+description. If none qualify, leaves `evolution` unset rather
    than storing an empty/placeholder chain."""
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": item_id})
    if not doc:
        return
    if doc.get("evolution") is not None and not force:
        return

    cursor = db[COLLECTIONS["policy_items"]].find(
        {"_id": {"$ne": item_id}, "item_date": {"$lt": doc["item_date"]}},
        {"title": 1, "description": 1, "ministry_id": 1, "pillar": 1, "item_date": 1},
    )
    candidates = [c async for c in cursor]
    if not candidates:
        return

    doc_tokens = _tokenize(_item_text(doc))
    candidate_tokens = [_tokenize(_item_text(c)) for c in candidates]
    idf = _idf([doc_tokens, *candidate_tokens])
    doc_vector = _tfidf_vector(doc_tokens, idf)

    neighbors = [
        c
        for c, tokens in zip(candidates, candidate_tokens)
        if _cosine_similarity(doc_vector, _tfidf_vector(tokens, idf)) >= ITEM_EVOLUTION_SIMILARITY_THRESHOLD
    ]
    if not neighbors:
        return

    cluster = neighbors + [doc]
    cluster.sort(key=lambda c: c["item_date"])
    cluster_tokens = [_tokenize(_item_text(c)) for c in cluster]

    ministry_names = await get_ministry_name_map(db)
    chain = _build_chain_from_items(_dashboard_items_payload(cluster, ministry_names), cluster_tokens)

    await db[COLLECTIONS["policy_items"]].update_one({"_id": item_id}, {"$set": {"evolution": chain}})


async def backfill_missing_item_evolution(db: AsyncIOMotorDatabase, limit: int = 100) -> int:
    """Admin-triggered retry job: (re-)attempts evolution generation for
    items that have no evolution yet — a no-op for items with genuinely no
    earlier-issue relatives, since generate_item_evolution just leaves those
    unset again."""
    cursor = db[COLLECTIONS["policy_items"]].find({"evolution": None}).limit(limit)
    count = 0
    async for doc in cursor:
        await generate_item_evolution(db, doc["_id"])
        after = await db[COLLECTIONS["policy_items"]].find_one({"_id": doc["_id"]}, {"evolution": 1})
        if after and after.get("evolution") is not None:
            count += 1
    return count
