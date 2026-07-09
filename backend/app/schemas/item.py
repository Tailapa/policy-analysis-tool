from typing import Literal, Optional

from pydantic import BaseModel

from app.schemas.common import format_item_date

Pillar = Literal[
    "Economic Growth",
    "Infrastructure",
    "Human Development",
    "National Security",
    "Rural & Agri",
    "Misc",
]
Status = Literal["Initiated", "Completed", "Announced"]
Impact = Literal["High", "Medium", "Low"]


class SourceOut(BaseModel):
    label: str
    url: str


class ItemOut(BaseModel):
    """Shape matches frontend src/types.ts Item exactly."""

    id: str
    title: str
    description: str
    ministry: str
    theme: Pillar
    status: Status
    impact: Impact
    date: str
    dateValue: int
    geography: str
    sources: list[SourceOut]
    tags: list[str]


class PaginatedItems(BaseModel):
    items: list[ItemOut]
    page: int
    page_size: int
    total: int
    total_pages: int


def serialize_item(doc: dict, ministry_name: str) -> ItemOut:
    geo = doc.get("geography", {"scope": "national", "states": []})
    if geo.get("scope") == "state" and geo.get("states"):
        geography_str = f"state: {geo['states'][0]}"
    else:
        geography_str = "national"

    sources = [
        SourceOut(label=s.get("label", ""), url=s.get("url") or "")
        for s in doc.get("sources", [])
    ]

    return ItemOut(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc["description"],
        ministry=ministry_name,
        theme=doc["pillar"],
        status=doc["status"],
        impact=doc["impact_level"],
        date=format_item_date(doc["item_date"]),
        dateValue=doc["item_date"].day,
        geography=geography_str,
        sources=sources,
        tags=doc.get("tags", []),
    )
