from datetime import date
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.db import get_db
from app.core.deps import get_current_admin
from app.schemas.item import serialize_item
from app.schemas.upload import IssueUploadResponse
from app.services.draft_detection import verify_draft_status
from app.services.ingestion import IngestionError, ingest_report
from app.services.lookups import get_ministry_map
from app.services.policy_evolution import generate_embedding_then_evolution

router = APIRouter(prefix="/api/admin", tags=["admin", "uploads"])


@router.post("/issues/upload", response_model=IssueUploadResponse, status_code=201)
async def upload_issue(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    label: Optional[str] = Form(None),
    period_start: Optional[date] = Form(None),
    period_end: Optional[date] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    settings = get_settings()
    file_bytes = await file.read()

    try:
        issue_doc, item_docs = await ingest_report(
            db,
            filename=file.filename or "upload",
            file_bytes=file_bytes,
            ministry_match_threshold=settings.MINISTRY_MATCH_THRESHOLD,
            label=label,
            period_start=period_start,
            period_end=period_end,
        )
    except IngestionError as e:
        raise HTTPException(status_code=422, detail=str(e))

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

    return IssueUploadResponse(
        issue_id=str(issue_doc["_id"]),
        issue_label=issue_doc["label"],
        items=items_out,
        item_count=len(items_out),
    )
