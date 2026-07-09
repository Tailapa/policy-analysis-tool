from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.utils import parse_object_id
from app.schemas.issue import IssueDetailOut, IssueOut, serialize_issue
from app.schemas.item import serialize_item
from app.services.lookups import get_ministry_name_map

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
    ministry_names = await get_ministry_name_map(db)
    items = [
        serialize_item(item, ministry_names.get(str(item["ministry_id"]), "Unknown Ministry"))
        for item in item_docs
    ]

    base = serialize_issue(doc, len(items))
    return IssueDetailOut(**base.model_dump(), items=items)
