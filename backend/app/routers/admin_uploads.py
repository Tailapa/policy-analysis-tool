from datetime import date
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.db import get_db
from app.core.deps import get_current_admin
from app.schemas.item import serialize_item
from app.schemas.upload import BulkIssueUploadResponse, IssueUploadResult
from app.services.draft_detection import verify_draft_status
from app.services.gridfs_storage import store_issue_pdf_and_link
from app.services.ingestion import IngestionError, ingest_report
from app.services.lookups import get_ministry_map
from app.services.policy_evolution import generate_embedding_then_evolution

router = APIRouter(prefix="/api/admin", tags=["admin", "uploads"])


@router.post("/issues/upload", response_model=BulkIssueUploadResponse, status_code=201)
async def upload_issues(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    label: Optional[str] = Form(None),
    period_start: Optional[date] = Form(None),
    period_end: Optional[date] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    """Accepts one or more .pdf/.docx files in a single request — each is
    ingested independently as its own issue, and a failure on one file
    doesn't abort the rest of the batch. The label/period_start/period_end
    manual overrides only apply when exactly one file is uploaded (they
    can't mean the same thing for a batch of different issues); with
    multiple files, each is auto-detected from its own cover page."""
    settings = get_settings()
    apply_overrides = len(files) == 1
    results: list[IssueUploadResult] = []

    for upload in files:
        filename = upload.filename or "upload"
        file_bytes = await upload.read()

        try:
            issue_doc, item_docs, pdf_bytes = await ingest_report(
                db,
                filename=filename,
                file_bytes=file_bytes,
                ministry_match_threshold=settings.MINISTRY_MATCH_THRESHOLD,
                label=label if apply_overrides else None,
                period_start=period_start if apply_overrides else None,
                period_end=period_end if apply_overrides else None,
            )
        except IngestionError as e:
            results.append(IssueUploadResult(filename=filename, success=False, error=str(e)))
            continue

        # Queued first, ahead of the per-item embedding/evolution/draft tasks
        # below — those can be numerous and slow (or rate-limited) on a large
        # issue, and FastAPI runs background tasks in the order they're
        # added, so PDF storage would otherwise sit behind all of them
        # despite having nothing to do with Gemini.
        background_tasks.add_task(
            store_issue_pdf_and_link, db, issue_doc["_id"], issue_doc["pdf_filename"], pdf_bytes
        )

        # ministry_map is refetched per file — resolve_ministry may have
        # just created a brand-new ministry while ingesting this file, and
        # serialize_item below needs that name to resolve correctly.
        ministry_map = await get_ministry_map(db)
        items_out = []
        for doc in item_docs:
            items_out.append(serialize_item(doc, ministry_map))
            # Optional, decoupled from ingestion (backend-spec.md §5 step 7 / §1) —
            # runs after the response-affecting work is done and never blocks or
            # rolls back the publish if it fails. Evolution needs the embedding
            # to exist first, so it's chained rather than queued independently.
            background_tasks.add_task(generate_embedding_then_evolution, db, doc["_id"])
            if doc.get("is_draft"):
                background_tasks.add_task(verify_draft_status, db, doc["_id"])

        results.append(
            IssueUploadResult(
                filename=filename,
                success=True,
                issue_id=str(issue_doc["_id"]),
                issue_label=issue_doc["label"],
                items=items_out,
                item_count=len(items_out),
            )
        )

    return BulkIssueUploadResponse(results=results)
