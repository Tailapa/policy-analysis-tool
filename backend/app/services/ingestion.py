from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS
from app.services import pdf_parser
from app.services.financial_extractor import extract_financial_outlay
from app.services.issue_meta import IssueMetaError, extract_issue_meta
from app.services.ministry_resolver import (
    find_additional_regulatory_body_links,
    find_ministry_mentioned_in_text,
    get_or_create_unmapped_ministry,
    resolve_ministry,
)
from app.services.report_chunker import ChunkingError, chunk_report
from app.services.source_link_matcher import match_source_links


class IngestionError(Exception):
    """Wraps a user-facing ingestion failure (bad file type, unparseable
    cover page, malformed chunk) for the router to turn into a 422."""


def _normalize_to_pdf(filename: str, file_bytes: bytes) -> tuple[str, bytes]:
    """PDF-only ingestion — no format conversion. A prior .docx-to-PDF path
    (via headless LibreOffice) has been removed."""
    if filename.lower().endswith(".pdf"):
        return filename, file_bytes
    raise IngestionError(f"Unsupported file type: {filename} (expected .pdf)")


async def ingest_report(
    db: AsyncIOMotorDatabase,
    filename: str,
    file_bytes: bytes,
    ministry_match_threshold: int,
    label: Optional[str] = None,
    period_start=None,
    period_end=None,
    pdf_url: str = "",
) -> tuple[dict, list[dict], bytes]:
    """Returns (issue_doc, item_docs, pdf_bytes) — pdf_bytes (the original
    upload) is handed back rather than stored inline here, so the caller can
    persist it to GridFS as a decoupled background task (see
    routers/admin_uploads.py) the same way evolution generation already is:
    never block or risk the publish response on a secondary step."""
    pdf_filename, pdf_bytes = _normalize_to_pdf(filename, file_bytes)
    raw_text, ordered_links = pdf_parser.extract_text_and_source_links(pdf_bytes)

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
        "pdf_file_id": None,
        "pdf_filename": pdf_filename,
        "executive_summary": "",
        "contributors": [],
        "published_at": now,
    }
    issue_result = await db[COLLECTIONS["issues"]].insert_one(issue_doc)
    issue_doc["_id"] = issue_result.inserted_id

    item_docs: list[dict] = []
    link_ptr = 0
    for parsed in parsed_items:
        needs_ministry_review = False
        if parsed.ministry_raw.strip():
            ministry_id, match_score = await resolve_ministry(db, parsed.ministry_raw, ministry_match_threshold)
        else:
            # The title had no "- Ministry X" segment at all (e.g. no anchor
            # line to split on). Only auto-map to a ministry that's actually
            # named somewhere in the item's own text — never guess from
            # outside knowledge — otherwise flag it for admin review rather
            # than spawning a junk ministry record (see ministry_resolver.py).
            mentioned_id = await find_ministry_mentioned_in_text(db, f"{parsed.title} {parsed.description}")
            if mentioned_id is not None:
                ministry_id, match_score = mentioned_id, 100.0
            else:
                ministry_id = await get_or_create_unmapped_ministry(db)
                match_score = 0.0
                needs_ministry_review = True
        if parsed.source_label is None:
            sources: list[dict] = []
        else:
            sources, link_ptr = match_source_links(parsed.source_label, ordered_links, link_ptr)
        additional_ministry_ids = await find_additional_regulatory_body_links(
            db, f"{parsed.title} {parsed.description}", ministry_id
        )
        financial_outlay = extract_financial_outlay(f"{parsed.title} {parsed.description}")

        doc = {
            "title": parsed.title,
            "description": parsed.description,
            "pillar": parsed.pillar,
            "subtype": parsed.subtype,
            "status": parsed.status,
            "impact_level": parsed.impact_level,
            "ministry_id": ministry_id,
            "additional_ministry_ids": additional_ministry_ids,
            "needs_ministry_review": needs_ministry_review,
            "sources": sources,
            "tags": [],
            "issue_id": issue_doc["_id"],
            "item_date": issue_doc["period_start"],
            "key_features": None,
            "why_it_matters": None,
            "is_draft": parsed.is_draft,
            "financial_outlay": financial_outlay,
            "parsing_meta": {"ministry_match_score": match_score},
            "created_at": now,
            "updated_at": now,
        }
        result = await db[COLLECTIONS["policy_items"]].insert_one(doc)
        doc["_id"] = result.inserted_id
        item_docs.append(doc)

    return issue_doc, item_docs, pdf_bytes
