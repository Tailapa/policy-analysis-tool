from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.policy_item import ConfidenceLevel, PunctuatedEquilibriumStage
from app.schemas.intelligence import PolicyIntelligenceOut, SourceCitationOut

# ---------------------------------------------------------------------------
# LLM-facing schema — enforced via response_schema=PolicyGovernanceResult.
# No genome here: the genome is computed server-side after this call
# resolves (see services/policy_governance.py), and wickedness.overall_score
# is likewise server-computed rather than requested from the model — same
# "never trust the LLM to keep a derived field consistent with its own
# component scores" lesson as the SCTP quadrant fix.
# ---------------------------------------------------------------------------


class StreamsResult(BaseModel):
    problem_score: float
    policy_score: float
    politics_score: float
    window_open: bool
    reasoning: str
    confidence: ConfidenceLevel


class PolicyEntrepreneurResult(BaseModel):
    actor: str
    influence: float
    contribution: str


class EntrepreneursResult(BaseModel):
    entrepreneurs: list[PolicyEntrepreneurResult] = Field(default_factory=list)
    reasoning: str
    confidence: ConfidenceLevel


class PunctuatedEquilibriumResult(BaseModel):
    stage: PunctuatedEquilibriumStage
    reasoning: str
    confidence: ConfidenceLevel


class WickednessDimensionsResult(BaseModel):
    implementation_complexity: float
    political_conflict: float
    federal_coordination: float
    scientific_uncertainty: float
    behaviour_change: float
    time_horizon: float
    cross_sector: float


class WickednessResult(BaseModel):
    dimensions: WickednessDimensionsResult
    reasoning: str
    brief: str
    confidence: ConfidenceLevel


class PolicyGovernanceResult(BaseModel):
    """Shape the LLM must return for response_schema=PolicyGovernanceResult."""

    streams: StreamsResult
    entrepreneurs: EntrepreneursResult
    punctuated_equilibrium: PunctuatedEquilibriumResult
    wickedness: WickednessResult


class SynthesisResult(BaseModel):
    """Shape of the follow-up call made after the main governance call
    resolves and the genome is computed — see generate_governance_for_item.
    Requires data (computed genome, possibly the intelligence doc, the full
    research record set) that doesn't exist until that point."""

    genome_brief: str
    research_brief: str
    synthesis_conclusion: str


# ---------------------------------------------------------------------------
# API-facing response models
# ---------------------------------------------------------------------------


class WickednessOut(WickednessResult):
    """Overrides `brief` with a default so governance docs generated before
    this field existed still validate — the frontend's AnalyticalBrief
    component already no-ops on an empty string."""

    overall_score: float
    brief: str = ""


class GovernanceGenomeOut(BaseModel):
    vector: list[float]
    dimensions: list[str]
    reasoning: str
    brief: str = ""
    confidence: ConfidenceLevel


class GGIOut(BaseModel):
    """Governance Genome Index — see methodology_documentation.md.
    Computed fresh at read-time by app.services.genome_index.compute_ggi,
    never stored, so it's absent (None) rather than validation-erroring for
    any governance record where this can't be computed."""

    lti: float
    cei: float
    plmi: float
    lii: float
    kmsi: float
    pei: float
    ggi_score: float
    window_open: bool
    confidence: ConfidenceLevel


class PolicyGovernanceOut(BaseModel):
    generated_at: str
    model: str
    streams: StreamsResult
    entrepreneurs: EntrepreneursResult
    punctuated_equilibrium: PunctuatedEquilibriumResult
    wickedness: WickednessOut
    genome: GovernanceGenomeOut
    ggi: Optional[GGIOut] = None
    research_brief: str = ""
    synthesis_conclusion: str = ""
    sources: list[SourceCitationOut] = Field(default_factory=list)


class GovernanceStatusOut(BaseModel):
    status: str  # "pending" | "ready"
    governance: Optional[PolicyGovernanceOut] = None


class TypologyMixOut(BaseModel):
    avg_regulatory: float
    avg_distributive: float
    avg_redistributive: float


class InstrumentMixOut(BaseModel):
    avg_educate: float
    avg_persuade: float
    avg_coerce: float
    avg_strengthen: float
    avg_incentivize: float


class FingerprintOut(BaseModel):
    label: str
    avg_genome_vector: list[float]
    genome_dimensions: list[str]
    avg_wickedness: float
    typology_mix: TypologyMixOut
    instrument_mix: InstrumentMixOut
    incremental_pct: float
    transformational_pct: float
    stakeholder_diversity: int
    sample_size: int


class StreamsAvgOut(BaseModel):
    avg_problem: float
    avg_policy: float
    avg_politics: float
    window_open_pct: float


class PEStageCountOut(BaseModel):
    stage: str
    count: int


class MinistryGenomeIndexOut(BaseModel):
    """Ministry-wide average of the Governance Genome Index and its six
    sub-indices, plus the two framework averages (Kingdon's Streams,
    Punctuated Equilibrium) that don't already have a ministry-scoped
    aggregate elsewhere. See methodology_documentation.md."""

    label: str
    avg_lti: float
    avg_cei: float
    avg_plmi: float
    avg_lii: float
    avg_kmsi: float
    avg_pei: float
    avg_ggi_score: float
    streams_avg: StreamsAvgOut
    pe_distribution: list[PEStageCountOut]
    sample_size: int


CompareType = Literal["policy", "ministry", "sector"]


class CompareEntryOut(BaseModel):
    id: str
    label: str
    intelligence: Optional[PolicyIntelligenceOut] = None
    governance: Optional[PolicyGovernanceOut] = None
    fingerprint: Optional[FingerprintOut] = None


class CompareGovernanceOut(BaseModel):
    type: CompareType
    entry_a: CompareEntryOut
    entry_b: CompareEntryOut
