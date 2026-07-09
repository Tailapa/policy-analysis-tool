from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS
from app.services import docx_parser, pdf_parser
from app.services.geo_tagger import tag_geography
from app.services.issue_meta import IssueMetaError, extract_issue_meta
from app.services.ministry_resolver import resolve_ministry
from app.services.report_chunker import ChunkingError, chunk_report
from app.services.source_link_matcher import match_source_links


class IngestionError(Exception):
    """Wraps a user-facing ingestion failure (bad file type, unparseable
    cover page, malformed chunk) for the router to turn into a 422."""


def _extract_raw_text_and_links(filename: str, file_bytes: bytes) -> tuple[str, list[tuple[str, str]]]:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return pdf_parser.extract_text_and_source_links(file_bytes)
    if lower.endswith(".docx"):
        # python-docx doesn't expose hyperlink runs as easily as PyMuPDF's
        # link annotations — DOCX uploads fall back to the curated
        # org->homepage lookup in source_link_matcher.py for every citation.
        return docx_parser.extract_text(file_bytes), []
    raise IngestionError(f"Unsupported file type: {filename} (expected .pdf or .docx)")


async def ingest_report(
    db: AsyncIOMotorDatabase,
    filename: str,
    file_bytes: bytes,
    ministry_match_threshold: int,
    label: Optional[str] = None,
    period_start=None,
    period_end=None,
    pdf_url: str = "",
) -> tuple[dict, list[dict]]:
    raw_text, ordered_links = _extract_raw_text_and_links(filename, file_bytes)

    if not (label and period_start and period_end):
        try:
            extracted_label, extracted_start, extracted_end = extract_issue_meta(raw_text)
        except IssueMetaError as e:
            raise IngestionError(str(e))
        label = label or extracted_label
        period_start = period_start or extracted_start
        period_end = period_end or extracted_end

    try:
        parsed_items = chunk_report(raw_text)
    except ChunkingError as e:
        raise IngestionError(str(e))

    now = datetime.now(timezone.utc)
    issue_doc = {
        "label": label,
        "period_start": datetime(period_start.year, period_start.month, period_start.day),
        "period_end": datetime(period_end.year, period_end.month, period_end.day),
        "pdf_url": pdf_url,
        "executive_summary": "",
        "contributors": [],
        "published_at": now,
    }
    issue_result = await db[COLLECTIONS["issues"]].insert_one(issue_doc)
    issue_doc["_id"] = issue_result.inserted_id

    item_docs: list[dict] = []
    link_ptr = 0
    for parsed in parsed_items:
        ministry_id, match_score = await resolve_ministry(db, parsed.ministry_raw, ministry_match_threshold)
        scope, states, geo_terms = tag_geography(f"{parsed.title} {parsed.description}")
        sources, link_ptr = match_source_links(parsed.source_label, ordered_links, link_ptr)

        doc = {
            "title": parsed.title,
            "description": parsed.description,
            "pillar": parsed.pillar,
            "subtype": parsed.subtype,
            "status": parsed.status,
            "impact_level": parsed.impact_level,
            "ministry_id": ministry_id,
            "sources": sources,
            "geography": {"scope": scope, "states": states},
            "tags": [],
            "issue_id": issue_doc["_id"],
            "item_date": issue_doc["period_start"],
            "key_features": None,
            "why_it_matters": None,
            "embedding": None,
            "parsing_meta": {"ministry_match_score": match_score, "geo_match_terms": geo_terms},
            "created_at": now,
            "updated_at": now,
        }
        result = await db[COLLECTIONS["policy_items"]].insert_one(doc)
        doc["_id"] = result.inserted_id
        item_docs.append(doc)

    return issue_doc, item_docs
