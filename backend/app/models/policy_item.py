from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

Pillar = Literal[
    "Economic Growth",
    "Infrastructure",
    "Human Development",
    "National Security",
    "Rural & Agri",
    "Misc",
]
Subtype = Literal["Policy Update", "Announcement"]
Status = Literal["Initiated", "Completed", "Announced"]
ImpactLevel = Literal["High", "Medium", "Low"]
GeoScope = Literal["national", "state"]


class SourceModel(BaseModel):
    label: str
    url: Optional[str] = None


class GeographyModel(BaseModel):
    scope: GeoScope
    states: list[str] = Field(default_factory=list)


class ParsingMeta(BaseModel):
    ministry_match_score: float = 0.0
    geo_match_terms: list[str] = Field(default_factory=list)


class PolicyItem(BaseModel):
    id: str = Field(alias="_id")
    title: str
    description: str
    pillar: Pillar
    subtype: Subtype
    status: Status
    impact_level: ImpactLevel
    ministry_id: str
    sources: list[SourceModel] = Field(default_factory=list)
    geography: GeographyModel
    tags: list[str] = Field(default_factory=list)
    issue_id: str
    item_date: date
    key_features: Optional[list[str]] = None
    why_it_matters: Optional[list[str]] = None
    embedding: Optional[list[float]] = None
    parsing_meta: ParsingMeta = Field(default_factory=ParsingMeta)
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}
