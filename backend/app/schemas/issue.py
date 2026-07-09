from pydantic import BaseModel

from app.schemas.common import format_date_range


class IssueOut(BaseModel):
    """Shape matches frontend src/types.ts Issue, plus fields the spec defines that the
    frontend doesn't currently render (executive_summary, contributors, pdf_url) — kept
    available for when the UI grows a surface for them."""

    id: str
    label: str
    dateRange: str
    itemsCount: int
    executive_summary: str = ""
    pdf_url: str = ""


class IssueDetailOut(IssueOut):
    items: list


def serialize_issue(doc: dict, item_count: int = 0) -> IssueOut:
    return IssueOut(
        id=str(doc["_id"]),
        label=doc["label"],
        dateRange=format_date_range(doc["period_start"], doc["period_end"]),
        itemsCount=item_count,
        executive_summary=doc.get("executive_summary", ""),
        pdf_url=doc.get("pdf_url", ""),
    )
