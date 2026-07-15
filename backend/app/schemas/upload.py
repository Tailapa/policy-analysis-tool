from typing import Optional

from pydantic import BaseModel

from app.schemas.item import Impact, ItemOut, SourceOut, Status


class IssueUploadResult(BaseModel):
    """One uploaded file's outcome — a batch upload returns one of these per
    file, so a failure on one doesn't prevent reporting success on others."""

    filename: str
    success: bool
    issue_id: Optional[str] = None
    issue_label: Optional[str] = None
    items: list[ItemOut] = []
    item_count: int = 0
    error: Optional[str] = None


class BulkIssueUploadResponse(BaseModel):
    results: list[IssueUploadResult]


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
    theme: str
    status: Status
    impact: Impact
    date: str
    dateValue: int
    geography: str
    sources: list[ManualSourceIn]
    tags: list[str]
    issue_id: Optional[str] = None
