from typing import Optional

from pydantic import BaseModel, Field

from app.models.policy_item import (
    ConfidenceLevel,
    LifecycleStage,
    LowiType,
    SCTPQuadrant,
    Severity,
)

# ---------------------------------------------------------------------------
# Gemini-facing response schema. This is what response_schema=... enforces on
# the model's structured output — no generated_at/model here, those are
# stamped server-side after parsing (see services/policy_intelligence.py).
# ---------------------------------------------------------------------------


class LowiResult(BaseModel):
    regulatory_score: float
    distributive_score: float
    redistributive_score: float
    dominant_type: LowiType
    reasoning: str
    confidence: ConfidenceLevel


class SCTPGroupResult(BaseModel):
    group_name: str
    quadrant: SCTPQuadrant
    power_score: float
    construction_score: float
    rationale: str
    confidence: ConfidenceLevel


class SCTPResult(BaseModel):
    groups: list[SCTPGroupResult]
    overall_reasoning: str


class EngagementResult(BaseModel):
    educate_score: float
    persuade_score: float
    coerce_score: float
    strengthen_score: float
    incentivize_score: float
    reasoning: str
    confidence: ConfidenceLevel


class LifecycleResult(BaseModel):
    current_stage: LifecycleStage
    reasoning: str
    confidence: ConfidenceLevel


class BlindSpotResult(BaseModel):
    description: str
    affected_group: str
    severity: Severity


class ImplementationResult(BaseModel):
    street_level_bureaucrats: list[str]
    blind_spots: list[BlindSpotResult]
    reasoning: str
    confidence: ConfidenceLevel


class LindblomResult(BaseModel):
    score: float
    reasoning: str
    confidence: ConfidenceLevel


class PolicyIntelligenceResult(BaseModel):
    """Shape Gemini must return for response_schema=PolicyIntelligenceResult."""

    lowi: LowiResult
    sctp: SCTPResult
    engagement: EngagementResult
    lifecycle: LifecycleResult
    implementation: ImplementationResult
    lindblom: LindblomResult


# ---------------------------------------------------------------------------
# API-facing response models
# ---------------------------------------------------------------------------


class SourceCitationOut(BaseModel):
    """Server-attached, not part of the LLM-facing schema above — populated
    directly from Serper results so citations are accurate by construction
    rather than relying on the model to restate URLs faithfully."""

    title: str
    url: str
    snippet: str
    query: str


class PolicyIntelligenceOut(PolicyIntelligenceResult):
    generated_at: str
    model: str
    sources: list[SourceCitationOut] = Field(default_factory=list)


class IntelligenceStatusOut(BaseModel):
    status: str  # "pending" | "ready"
    intelligence: Optional[PolicyIntelligenceOut] = None


class SCTPAggregatePoint(BaseModel):
    item_id: str
    item_title: str
    ministry: str
    pillar: str
    group_name: str
    quadrant: SCTPQuadrant
    power_score: float
    construction_score: float


class SCTPAggregateOut(BaseModel):
    points: list[SCTPAggregatePoint]
    sample_size: int
    truncated: bool = False


class EngagementAggregateOut(BaseModel):
    avg_educate: float
    avg_persuade: float
    avg_coerce: float
    avg_strengthen: float
    avg_incentivize: float
    sample_size: int


class LifecycleStageCount(BaseModel):
    stage: str
    count: int


class LifecycleAggregateOut(BaseModel):
    distribution: list[LifecycleStageCount]
    sample_size: int


class LowiAggregateOut(BaseModel):
    avg_regulatory: float
    avg_distributive: float
    avg_redistributive: float
    sample_size: int


class EngagementBreakdownRow(BaseModel):
    label: str
    avg_educate: float
    avg_persuade: float
    avg_coerce: float
    avg_strengthen: float
    avg_incentivize: float
    sample_size: int


class EngagementBreakdownOut(BaseModel):
    group_by: str
    rows: list[EngagementBreakdownRow]


class GenerateQueuedOut(BaseModel):
    status: str = "queued"


class BackfillResultOut(BaseModel):
    backfilled: int
