from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

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


ConfidenceLevel = Literal["low", "medium", "high"]


class SourceCitationModel(BaseModel):
    """Server-attached from Serper results during generation — not produced
    by the LLM itself. See PolicyEvolutionModel.sources / DraftVerificationModel.sources."""

    title: str
    url: str
    snippet: str
    query: str


EvolutionStageSource = Literal["dashboard", "research"]


class EvolutionStageModel(BaseModel):
    label: str
    year: str
    description: str
    source: EvolutionStageSource
    item_id: Optional[str] = None


class PolicyEvolutionModel(BaseModel):
    """This item's own genealogy timeline, built only from other PDF-ingested
    items in earlier issues that are semantically related to it (see
    generate_item_evolution in services/policy_evolution.py) — no web
    grounding. Auto-generated at ingestion once the item's embedding is
    ready; left unset entirely if no qualifying earlier-issue relatives are
    found, so the frontend section stays hidden rather than showing an empty
    state."""

    theme_label: str
    stages: list[EvolutionStageModel] = Field(default_factory=list)
    synthesis: str
    sources: list[SourceCitationModel] = Field(default_factory=list)
    generated_at: datetime
    model: str


class DraftVerificationModel(BaseModel):
    """Gemini+Serper cross-check of an item already flagged is_draft=True
    from the PDF text — supplementary annotation only, never overrides
    is_draft (the PDF is the primary source of truth for Drafts-tab
    membership)."""

    still_draft: bool
    reasoning: str
    sources: list[SourceCitationModel] = Field(default_factory=list)
    generated_at: datetime
    model: str


class PolicyItem(BaseModel):
    id: str = Field(alias="_id")
    title: str
    description: str
    pillar: str
    subtype: Subtype
    status: Status
    impact_level: ImpactLevel
    ministry_id: str
    additional_ministry_ids: list[str] = Field(default_factory=list)
    sources: list[SourceModel] = Field(default_factory=list)
    geography: GeographyModel
    tags: list[str] = Field(default_factory=list)
    issue_id: str
    item_date: date
    key_features: Optional[list[str]] = None
    why_it_matters: Optional[list[str]] = None
    embedding: Optional[list[float]] = None
    evolution: Optional[PolicyEvolutionModel] = None
    is_draft: bool = False
    draft_verification: Optional[DraftVerificationModel] = None
    parsing_meta: ParsingMeta = Field(default_factory=ParsingMeta)
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}
