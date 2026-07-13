"""Draft-policy detection. The PDF is the primary source of truth —
detect_draft_from_text() is a pure keyword heuristic run at ingestion time
against the parsed item text, and its result (is_draft) is what actually
determines Drafts-tab membership. verify_draft_status() is a supplementary,
best-effort Gemini+Serper cross-check queued only for items already flagged
by the PDF text — it never overwrites is_draft, it just attaches a
`draft_verification` annotation (e.g. "sources suggest this has since been
finalized") for admins/readers to weigh alongside the PDF signal.
"""

import logging
import re
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS
from app.schemas.draft import DraftVerificationResult
from app.services.llm_structured import active_model_name, generate_structured
from app.services.lookups import get_ministry_name_map
from app.services.research import format_research_context, run_research_phase

logger = logging.getLogger(__name__)

_DRAFT_KEYWORDS_RE = re.compile(
    r"\bdraft\b"
    r"|draft rules|draft regulations|draft notification|draft guidelines|draft policy|draft bill"
    r"|exposure draft|consultation paper"
    r"|public consultation|invites? comments|invited comments"
    r"|proposed (?:rules|regulations|guidelines)",
    re.IGNORECASE,
)


def detect_draft_from_text(title: str, description: str) -> bool:
    """Primary signal, computed purely from the PDF-extracted text — no LLM
    call. Deliberately simple/over-inclusive; verify_draft_status is the
    (optional, best-effort) second opinion, not the other way around."""
    return bool(_DRAFT_KEYWORDS_RE.search(f"{title} {description}"))


def _build_planning_prompt(title: str, ministry_name: str, description: str) -> str:
    return f"""An Indian government policy tracker flagged the following item as a draft, based on language \
in the source PDF ("draft", "public consultation", "invites comments", etc.):

Title: {title}
Ministry/Body: {ministry_name}
Description: {description}

Decide what web searches would confirm whether this is still in draft/consultation form as of today, or \
whether it has since been finalized/notified. Call web_search with up to 3 well-targeted queries. If you \
can't identify anything worth searching for, don't call the tool — just say so briefly."""


def _build_verification_prompt(title: str, ministry_name: str, description: str, research_context: str) -> str:
    research_block = f"\n{research_context}\n" if research_context else "\n(no web research available)\n"
    return f"""You are cross-checking a policy tracker's draft-status flag for an Indian governance dashboard.

ITEM (flagged as a draft from its source PDF text)
Title: {title}
Ministry/Body: {ministry_name}
Description: {description}
{research_block}
Based on the web research above (if any), decide:

1. still_draft: true if the evidence suggests this is still in draft/consultation form, false if it has \
since been finalized/notified/withdrawn. If the research above found nothing useful, default to true (trust \
the PDF's own draft language) rather than guessing.

2. reasoning: a ~60-100 word explanation citing what the research (or absence of it) shows.

Return your answer as JSON matching the required schema exactly."""


async def verify_draft_status(db: AsyncIOMotorDatabase, item_id, force: bool = False) -> None:
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": item_id})
    if not doc:
        return
    if not doc.get("is_draft"):
        return
    if doc.get("draft_verification") is not None and not force:
        return

    ministry_names = await get_ministry_name_map(db)
    ministry_name = ministry_names.get(str(doc["ministry_id"]), "Unknown Ministry")

    planning_prompt = _build_planning_prompt(doc["title"], ministry_name, doc["description"])
    research_records = await run_research_phase(planning_prompt)
    research_context = format_research_context(research_records)

    verification_prompt = _build_verification_prompt(doc["title"], ministry_name, doc["description"], research_context)
    result = await generate_structured(verification_prompt, DraftVerificationResult)
    if result is None:
        return

    sources = [
        {"title": r["title"], "url": r["url"], "snippet": r["snippet"], "query": record["query"]}
        for record in research_records
        for r in record["results"]
    ]

    draft_verification = {
        "still_draft": result.still_draft,
        "reasoning": result.reasoning,
        "sources": sources,
        "generated_at": datetime.now(timezone.utc),
        "model": active_model_name(),
    }
    await db[COLLECTIONS["policy_items"]].update_one(
        {"_id": item_id}, {"$set": {"draft_verification": draft_verification}}
    )
