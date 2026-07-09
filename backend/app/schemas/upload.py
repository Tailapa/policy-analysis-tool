from typing import Optional

from pydantic import BaseModel

from app.schemas.item import Impact, ItemOut, Pillar, SourceOut, Status


class IssueUploadResponse(BaseModel):
    issue_id: str
    issue_label: str
    items: list[ItemOut]
    item_count: int


class ManualSourceIn(BaseModel):
    label: str
    url: str


class ManualItemCreate(BaseModel):
    """Supplementary, non-spec endpoint: lets an editor hand-author a single item
    (the frontend's original Upload.tsx form flow), separate from the spec's
    file-based bulk ingestion pipeline. See reconciliation note."""

    title: str
    description: str
    ministry: str
    theme: Pillar
    status: Status
    impact: Impact
    date: str
    dateValue: int
    geography: str
    sources: list[ManualSourceIn]
    tags: list[str]
    issue_id: Optional[str] = None
