import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.db import COLLECTIONS, get_db
from app.core.utils import parse_object_id
from app.schemas.item import ItemOut, PaginatedItems, serialize_item
from app.services.lookups import get_ministry_map
from app.services.pdf_export import generate_item_pdf, generate_items_report_pdf

router = APIRouter(prefix="/api/items", tags=["items"])
states_router = APIRouter(prefix="/api/states", tags=["items"])


class PdfReportRequest(BaseModel):
    item_ids: list[str]
    report_title: str
    report_subtitle: Optional[str] = None


def _pdf_filename(title: str) -> str:
    safe = "".join(c if c.isalnum() or c in " -_" else "" for c in title).strip() or "report"
    return f"{safe}.pdf"


@router.get("", response_model=PaginatedItems)
async def list_items(
    pillar: Optional[str] = None,
    subtype: Optional[str] = None,
    status: Optional[str] = None,
    impact_level: Optional[str] = None,
    ministry_id: Optional[str] = None,
    state: Optional[str] = None,
    issue_id: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=1000),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query: dict = {}
    if pillar:
        query["pillar"] = pillar
    if subtype:
        query["subtype"] = subtype
    if status:
        query["status"] = status
    if impact_level:
        query["impact_level"] = impact_level
    if ministry_id:
        oid = parse_object_id(ministry_id)
        query["$or"] = [{"ministry_id": oid}, {"additional_ministry_ids": oid}]
    if state:
        query["geography.states"] = state
    if issue_id:
        query["issue_id"] = parse_object_id(issue_id)
    if q:
        query["$text"] = {"$search": q}

    collection = db[COLLECTIONS["policy_items"]]
    total = await collection.count_documents(query)
    total_pages = max(1, (total + page_size - 1) // page_size)

    cursor = (
        collection.find(query)
        .sort("item_date", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    docs = [doc async for doc in cursor]

    ministry_map = await get_ministry_map(db)
    items = [serialize_item(doc, ministry_map) for doc in docs]

    return PaginatedItems(items=items, page=page, page_size=page_size, total=total, total_pages=total_pages)


@router.get("/{item_id}", response_model=ItemOut)
async def get_item(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(item_id, "Item not found")
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")

    ministry_map = await get_ministry_map(db)
    return serialize_item(doc, ministry_map)


@router.get("/{item_id}/pdf")
async def download_item_pdf(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(item_id, "Item not found")
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")

    ministry_map = await get_ministry_map(db)
    pdf_bytes = generate_item_pdf(doc, ministry_map)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_pdf_filename(doc["title"])}"'},
    )


@router.post("/pdf-report")
async def download_items_report_pdf(payload: PdfReportRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    oids = [parse_object_id(i, "Item not found") for i in payload.item_ids]
    if not oids:
        raise HTTPException(status_code=422, detail="No item_ids provided")

    docs = [
        doc
        async for doc in db[COLLECTIONS["policy_items"]].find({"_id": {"$in": oids}}).sort("item_date", -1)
    ]
    if not docs:
        raise HTTPException(status_code=404, detail="No matching items found")

    ministry_map = await get_ministry_map(db)
    pdf_bytes = generate_items_report_pdf(docs, ministry_map, payload.report_title, payload.report_subtitle)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_pdf_filename(payload.report_title)}"'},
    )


@states_router.get("/{state_code}/items", response_model=list[ItemOut])
async def list_items_by_state(state_code: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    collection = db[COLLECTIONS["policy_items"]]
    cursor = collection.find({"geography.states": state_code}).sort("item_date", -1)
    docs = [doc async for doc in cursor]

    ministry_map = await get_ministry_map(db)
    return [serialize_item(doc, ministry_map) for doc in docs]
