from datetime import date, datetime

from pydantic import BaseModel, Field


class Contributor(BaseModel):
    name: str
    role: str


class Issue(BaseModel):
    id: str = Field(alias="_id")
    label: str
    period_start: date
    period_end: date
    pdf_url: str = ""
    executive_summary: str = ""
    contributors: list[Contributor] = Field(default_factory=list)
    published_at: datetime

    model_config = {"populate_by_name": True}
