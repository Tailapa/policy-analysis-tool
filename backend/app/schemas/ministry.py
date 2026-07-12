from pydantic import BaseModel

from app.models.ministry import MinistryCategory


class MinistryOut(BaseModel):
    """Shape matches frontend src/types.ts Ministry, plus id for admin CRUD / filtering."""

    id: str
    name: str
    minister: str
    icon: str
    itemCount: int
    category: MinistryCategory = "ministry"


class MinistryDetailOut(MinistryOut):
    items: list


class MinistryCreate(BaseModel):
    name: str
    minister_name: str | None = None
    department: str | None = None
    seal_url: str | None = None
    icon: str = "Building2"
    category: MinistryCategory = "ministry"


class MinistryUpdate(BaseModel):
    name: str | None = None
    minister_name: str | None = None
    department: str | None = None
    seal_url: str | None = None
    icon: str | None = None
    category: MinistryCategory | None = None


def serialize_ministry(doc: dict, item_count: int = 0) -> MinistryOut:
    return MinistryOut(
        id=str(doc["_id"]),
        name=doc["name"],
        minister=doc.get("minister_name") or "",
        icon=doc.get("icon") or "Building2",
        itemCount=item_count,
        category=doc.get("category") or "ministry",
    )
