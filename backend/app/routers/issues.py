import io
import zipfile
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.utils import parse_object_id
from app.schemas.issue import IssueDetailOut, IssueOut, serialize_issue
from app.schemas.item import serialize_item
from app.services.gridfs_storage import read_issue_pdf
from app.services.lookups import get_ministry_map

router = APIRouter(prefix="/api/issues", tags=["issues"])


@router.get("", response_model=list[IssueOut])
async def list_issues(
    q: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query: dict = {}
    if q:
        query["label"] = {"$regex": q, "$options": "i"}

    cursor = (
        db[COLLECTIONS["issues"]]
        .find(query)
        .sort("published_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    issues = [doc async for doc in cursor]

    counts = {
        row["_id"]: row["count"]
        async for row in db[COLLECTIONS["policy_items"]].aggregate(
            [{"$group": {"_id": "$issue_id", "count": {"$sum": 1}}}]
        )
    }

    return [serialize_issue(doc, counts.get(doc["_id"], 0)) for doc in issues]


@router.get("/{issue_id}", response_model=IssueDetailOut)
async def get_issue(issue_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(issue_id, "Issue not found")
    doc = await db[COLLECTIONS["issues"]].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Issue not found")

    item_docs = [
        item
        async for item in db[COLLECTIONS["policy_items"]]
        .find({"issue_id": oid})
        .sort("item_date", -1)
    ]
    ministry_map = await get_ministry_map(db)
    items = [serialize_item(item, ministry_map) for item in item_docs]

    base = serialize_issue(doc, len(items))
    return IssueDetailOut(**base.model_dump(), items=items)


@router.get("/pdf/bulk")
async def download_issues_pdf_bulk(issue_ids: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Zips the matched issues' original source PDFs on the fly.
    `issue_ids` is a comma-separated list (matches this codebase's existing
    comma-separated-list convention, e.g. CORS_ORIGINS/ADMIN_USERS)."""
    oids = [parse_object_id(i.strip(), "Issue not found") for i in issue_ids.split(",") if i.strip()]
    if not oids:
        raise HTTPException(status_code=422, detail="No issue_ids provided")

    docs = [doc async for doc in db[COLLECTIONS["issues"]].find({"_id": {"$in": oids}})]
    downloadable = [doc for doc in docs if doc.get("pdf_file_id")]
    if not downloadable:
        raise HTTPException(status_code=404, detail="None of the requested issues have a stored PDF")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for doc in downloadable:
            pdf_bytes = await read_issue_pdf(db, ObjectId(doc["pdf_file_id"]))
            filename = doc.get("pdf_filename") or f"{doc['label']}.pdf"
            zf.writestr(filename, pdf_bytes)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="india-governance-watch-issues.zip"'},
    )


@router.get("/{issue_id}/pdf")
async def download_issue_pdf(issue_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(issue_id, "Issue not found")
    doc = await db[COLLECTIONS["issues"]].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Issue not found")
    if not doc.get("pdf_file_id"):
        raise HTTPException(status_code=404, detail="No PDF stored for this issue")

    pdf_bytes = await read_issue_pdf(db, ObjectId(doc["pdf_file_id"]))
    filename = doc.get("pdf_filename") or f"{doc['label']}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
