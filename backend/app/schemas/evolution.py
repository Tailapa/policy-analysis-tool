from typing import Literal, Optional

from pydantic import BaseModel, Field


class EvolutionStageResult(BaseModel):
    label: str  # short stage name, e.g. item title
    year: str  # e.g. "May 2026"
    description: str  # truncated item description
    source: Literal["dashboard"] = "dashboard"
    item_id: Optional[str] = None


class GenerateEvolutionOut(BaseModel):
    status: str = "queued"


class EvolutionBackfillResultOut(BaseModel):
    chains_generated: int


class ItemEvolutionOut(BaseModel):
    theme_label: str
    stages: list[EvolutionStageResult] = Field(default_factory=list)
    synthesis: str
    generated_at: str
    method: str


class ItemEvolutionStatusOut(BaseModel):
    status: str  # "pending" | "ready"
    evolution: Optional[ItemEvolutionOut] = None
