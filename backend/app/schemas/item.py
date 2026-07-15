from typing import Literal, Optional

from pydantic import BaseModel

from app.models.ministry import MinistryCategory
from app.schemas.common import format_item_date

Status = Literal["Initiated", "Completed", "Announced"]
Impact = Literal["High", "Medium", "Low"]
Subtype = Literal["Policy Update", "Announcement"]


class SourceOut(BaseModel):
    label: str
    url: str


class MinistryRefOut(BaseModel):
    id: str
    name: str
    category: MinistryCategory


class DraftVerificationOut(BaseModel):
    still_draft: bool
    reasoning: str
    source_count: int
    generated_at: str


class ItemOut(BaseModel):
    """Shape matches frontend src/types.ts Item exactly."""

    id: str
    issueId: str
    title: str
    description: str
    ministry: str
    linkedMinistries: list[MinistryRefOut]
    theme: str
    subtype: Subtype
    status: Optional[Status] = None
    impact: Optional[Impact] = None
    date: str
    dateValue: int
    geography: str
    sources: list[SourceOut]
    tags: list[str]
    isDraft: bool = False
    draftVerification: Optional[DraftVerificationOut] = None
    financialOutlay: Optional[str] = None


class PaginatedItems(BaseModel):
    items: list[ItemOut]
    page: int
    page_size: int
    total: int
    total_pages: int


def serialize_item(doc: dict, ministry_map: dict[str, dict]) -> ItemOut:
    """`ministry_map` is id -> {"name", "category"} (see
    services/lookups.get_ministry_map), covering every ministry/regulatory
    body referenced by this item (primary + additional links)."""
    geo = doc.get("geography", {"scope": "national", "states": []})
    if geo.get("scope") == "state" and geo.get("states"):
        geography_str = f"state: {geo['states'][0]}"
    else:
        geography_str = "national"

    sources = [
        SourceOut(label=s.get("label", ""), url=s.get("url") or "")
        for s in doc.get("sources", [])
    ]

    linked_ids = [str(doc["ministry_id"])] + [str(mid) for mid in doc.get("additional_ministry_ids", [])]
    linked_ministries = [
        MinistryRefOut(id=mid, name=ministry_map[mid]["name"], category=ministry_map[mid]["category"])
        for mid in linked_ids
        if mid in ministry_map
    ]
    primary_name = linked_ministries[0].name if linked_ministries else "Unknown Ministry"

    draft_verification = None
    dv = doc.get("draft_verification")
    if dv:
        draft_verification = DraftVerificationOut(
            still_draft=dv["still_draft"],
            reasoning=dv["reasoning"],
            source_count=len(dv.get("sources", [])),
            generated_at=dv["generated_at"].isoformat(),
        )

    return ItemOut(
        id=str(doc["_id"]),
        issueId=str(doc["issue_id"]),
        title=doc["title"],
        description=doc["description"],
        ministry=primary_name,
        linkedMinistries=linked_ministries,
        theme=doc["pillar"],
        subtype=doc["subtype"],
        status=doc["status"],
        impact=doc["impact_level"],
        date=format_item_date(doc["item_date"]),
        dateValue=doc["item_date"].day,
        geography=geography_str,
        sources=sources,
        tags=doc.get("tags", []),
        isDraft=doc.get("is_draft", False),
        draftVerification=draft_verification,
        financialOutlay=doc.get("financial_outlay"),
    )
