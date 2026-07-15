from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS
from app.services import pdf_parser
from app.services.docx_converter import ConversionError, convert_docx_to_pdf
from app.services.draft_detection import detect_draft_from_text
from app.services.financial_extractor import extract_financial_outlay
from app.services.geo_tagger import tag_geography
from app.services.issue_meta import IssueMetaError, extract_issue_meta
from app.services.ministry_resolver import find_additional_regulatory_body_links, resolve_ministry
from app.services.report_chunker import ChunkingError, chunk_report
from app.services.source_link_matcher import match_source_links


class IngestionError(Exception):
    """Wraps a user-facing ingestion failure (bad file type, unparseable
    cover page, malformed chunk) for the router to turn into a 422."""


async def _normalize_to_pdf(filename: str, file_bytes: bytes) -> tuple[str, bytes]:
    """A .docx upload is converted to .pdf *before* anything else, so it
    then flows through the exact same parsing (and storage) pipeline as a
    native PDF upload. This isn't a default/convenience choice — direct
    .docx text extraction (python-docx's paragraph.text) was tested against
    5 real uploaded issue .docx files and failed to chunk *all 5*: Word's
    numbered-list markers are applied by Word's own numbering engine, not
    stored as literal text, so report_chunker.py's item-marker regex never
    finds them. See docx_converter.py's docstring for the full comparison."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return filename, file_bytes
    if lower.endswith(".docx"):
        try:
            pdf_bytes = await convert_docx_to_pdf(file_bytes)
        except ConversionError as e:
            raise IngestionError(str(e))
        pdf_filename = filename.rsplit(".", 1)[0] + ".pdf"
        return pdf_filename, pdf_bytes
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
) -> tuple[dict, list[dict], bytes]:
    """Returns (issue_doc, item_docs, pdf_bytes) — pdf_bytes (the original
    upload, or its converted-from-.docx form) is handed back rather than
    stored inline here, so the caller can persist it to GridFS as a
    decoupled background task (see routers/admin_uploads.py) the same way
    embeddings/evolution/draft-verification already are: never block or
    risk the publish response on a secondary step."""
    pdf_filename, pdf_bytes = await _normalize_to_pdf(filename, file_bytes)
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
        ministry_id, match_score = await resolve_ministry(db, parsed.ministry_raw, ministry_match_threshold)
        scope, states, geo_terms = tag_geography(f"{parsed.title} {parsed.description}")
        if parsed.source_label is None:
            sources: list[dict] = []
        else:
            sources, link_ptr = match_source_links(parsed.source_label, ordered_links, link_ptr)
        additional_ministry_ids = await find_additional_regulatory_body_links(
            db, f"{parsed.title} {parsed.description}", ministry_id
        )
        is_draft = detect_draft_from_text(parsed.title, parsed.description)
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
            "sources": sources,
            "geography": {"scope": scope, "states": states},
            "tags": [],
            "issue_id": issue_doc["_id"],
            "item_date": issue_doc["period_start"],
            "key_features": None,
            "why_it_matters": None,
            "embedding": None,
            "is_draft": is_draft,
            "draft_verification": None,
            "financial_outlay": financial_outlay,
            "parsing_meta": {"ministry_match_score": match_score, "geo_match_terms": geo_terms},
            "created_at": now,
            "updated_at": now,
        }
        result = await db[COLLECTIONS["policy_items"]].insert_one(doc)
        doc["_id"] = result.inserted_id
        item_docs.append(doc)

    return issue_doc, item_docs, pdf_bytes
