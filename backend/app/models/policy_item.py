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


ConfidenceLevel = Literal["low", "medium", "high"]
LowiType = Literal["regulatory", "distributive", "redistributive"]
SCTPQuadrant = Literal["advantaged", "contender", "dependent", "deviant"]
LifecycleStage = Literal[
    "Problem Identification & Agenda Setting",
    "Policy Formulation",
    "Legitimation & Adoption",
    "Implementation",
    "Evaluation",
    "Maintenance, Succession & Termination",
]
Severity = Literal["low", "medium", "high"]


class LowiModel(BaseModel):
    regulatory_score: float
    distributive_score: float
    redistributive_score: float
    dominant_type: LowiType
    reasoning: str
    confidence: ConfidenceLevel


class SCTPGroupModel(BaseModel):
    group_name: str
    quadrant: SCTPQuadrant
    power_score: float  # 0 powerless .. 1 powerful
    construction_score: float  # 0 undeserving .. 1 deserving
    rationale: str
    confidence: ConfidenceLevel


class SCTPModel(BaseModel):
    groups: list[SCTPGroupModel] = Field(default_factory=list)
    overall_reasoning: str


class EngagementModel(BaseModel):
    educate_score: float
    persuade_score: float
    coerce_score: float
    strengthen_score: float
    incentivize_score: float
    reasoning: str
    confidence: ConfidenceLevel


class LifecycleModel(BaseModel):
    current_stage: LifecycleStage
    reasoning: str
    confidence: ConfidenceLevel


class BlindSpotModel(BaseModel):
    description: str
    affected_group: str
    severity: Severity


class ImplementationModel(BaseModel):
    street_level_bureaucrats: list[str] = Field(default_factory=list)
    blind_spots: list[BlindSpotModel] = Field(default_factory=list)
    reasoning: str
    confidence: ConfidenceLevel


class LindblomModel(BaseModel):
    score: float  # 0.0 pure rational-comprehensive .. 1.0 pure disjointed incrementalism
    reasoning: str
    confidence: ConfidenceLevel


class SourceCitationModel(BaseModel):
    """Server-attached from Serper results during generation — not produced
    by the LLM itself. See PolicyIntelligenceModel.sources."""

    title: str
    url: str
    snippet: str
    query: str


class PolicyIntelligenceModel(BaseModel):
    generated_at: datetime
    model: str
    lowi: LowiModel
    sctp: SCTPModel
    engagement: EngagementModel
    lifecycle: LifecycleModel
    implementation: ImplementationModel
    lindblom: LindblomModel
    sources: list[SourceCitationModel] = Field(default_factory=list)


PunctuatedEquilibriumStage = Literal[
    "Policy Monopoly (Stasis)",
    "Image Erosion & Venue Shopping",
    "Positive Feedback Punctuation",
    "New Equilibrium (Post-Punctuation)",
]


class StreamsModel(BaseModel):
    problem_score: float  # 0-5
    policy_score: float  # 0-5
    politics_score: float  # 0-5
    window_open: bool
    reasoning: str
    confidence: ConfidenceLevel


class PolicyEntrepreneurModel(BaseModel):
    actor: str
    influence: float  # 0-1
    contribution: str


class EntrepreneursModel(BaseModel):
    entrepreneurs: list[PolicyEntrepreneurModel] = Field(default_factory=list)
    reasoning: str
    confidence: ConfidenceLevel


class PunctuatedEquilibriumModel(BaseModel):
    stage: PunctuatedEquilibriumStage
    reasoning: str
    confidence: ConfidenceLevel


class WickednessDimensionsModel(BaseModel):
    implementation_complexity: float
    political_conflict: float
    federal_coordination: float
    scientific_uncertainty: float
    behaviour_change: float
    time_horizon: float
    cross_sector: float


class WickednessModel(BaseModel):
    dimensions: WickednessDimensionsModel
    overall_score: float  # 0-100, computed server-side = mean(dimensions) * 100
    reasoning: str
    brief: str = ""  # ~250-word analytical brief, LLM-written in the main call
    confidence: ConfidenceLevel


class GovernanceGenomeModel(BaseModel):
    """A ten-dimension signature derived deterministically from the other
    intelligence/governance modules (see policy_governance.py) — never
    LLM-generated, so it can only ever exist once those modules already do.
    `brief` is the exception: LLM-written prose interpreting the already-
    computed vector, from the follow-up synthesis call."""

    vector: list[float]
    dimensions: list[str]
    reasoning: str
    brief: str = ""  # ~350-word analytical brief
    confidence: ConfidenceLevel


class PolicyGovernanceModel(BaseModel):
    generated_at: datetime
    model: str
    streams: StreamsModel
    entrepreneurs: EntrepreneursModel
    punctuated_equilibrium: PunctuatedEquilibriumModel
    wickedness: WickednessModel
    genome: GovernanceGenomeModel
    research_brief: str = ""  # ~500-word brief on new findings from web research, with [n] citations
    synthesis_conclusion: str = ""  # ~200-word conclusion drawing on all ten frameworks
    sources: list[SourceCitationModel] = Field(default_factory=list)


EvolutionStageSource = Literal["dashboard", "research"]


class EvolutionStageModel(BaseModel):
    label: str
    year: str
    description: str
    source: EvolutionStageSource
    item_id: Optional[str] = None


class PolicyEvolutionModel(BaseModel):
    """This item's own genealogy timeline — same shape as the cross-policy
    policy_evolution collection docs (services/policy_evolution.py), just
    scoped to one item's semantic neighborhood instead of a dataset-wide
    cluster. Stored on the item itself, admin-triggered like intelligence/
    governance rather than auto-generated on publish (see
    generate_item_evolution's docstring for why)."""

    theme_label: str
    stages: list[EvolutionStageModel] = Field(default_factory=list)
    synthesis: str
    sources: list[SourceCitationModel] = Field(default_factory=list)
    generated_at: datetime
    model: str


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
    intelligence: Optional[PolicyIntelligenceModel] = None
    governance: Optional[PolicyGovernanceModel] = None
    evolution: Optional[PolicyEvolutionModel] = None
    parsing_meta: ParsingMeta = Field(default_factory=ParsingMeta)
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}
