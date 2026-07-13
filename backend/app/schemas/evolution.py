from typing import Literal, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# LLM-facing schema — enforced via response_schema=EvolutionSynthesisResult.
# ---------------------------------------------------------------------------


class EvolutionStageResult(BaseModel):
    label: str  # short stage name, e.g. "FAME Scheme (2015)"
    year: str  # approx year or date range, e.g. "2015" or "2019-2022"
    description: str  # 1-2 sentence description of this stage
    source: Literal["dashboard", "research"]
    item_id: Optional[str] = None  # set only when source == "dashboard"


class EvolutionSynthesisResult(BaseModel):
    theme_label: str
    stages: list[EvolutionStageResult] = Field(default_factory=list)
    synthesis: str  # ~120-150 word narrative tying the genealogy together


# ---------------------------------------------------------------------------
# API-facing / storage shape
# ---------------------------------------------------------------------------


class EvolutionSourceOut(BaseModel):
    title: str
    url: str
    snippet: str
    query: str


class GenerateEvolutionOut(BaseModel):
    status: str = "queued"


class EvolutionBackfillResultOut(BaseModel):
    chains_generated: int


class ItemEvolutionOut(BaseModel):
    theme_label: str
    stages: list[EvolutionStageResult]
    synthesis: str
    sources: list[EvolutionSourceOut] = Field(default_factory=list)
    generated_at: str
    model: str


class ItemEvolutionStatusOut(BaseModel):
    status: str  # "pending" | "ready"
    evolution: Optional[ItemEvolutionOut] = None
