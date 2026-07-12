export type Pillar = string;

export type Status = 'Initiated' | 'Completed' | 'Announced';

export type Impact = 'High' | 'Medium' | 'Low';

export interface Source {
  label: string;
  url: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  ministry: string;
  theme: Pillar;
  status: Status;
  impact: Impact;
  date: string; // e.g. '16 Jun', '17 Jun', etc.
  dateValue: number; // For sorting and timeline (day in June 2026, e.g. 16, 17...)
  geography: string; // 'national' or 'state: StateName'
  sources: Source[];
  tags: string[];
}

export type MinistryCategory = 'ministry' | 'regulatory_body';

export interface Ministry {
  id: string;
  name: string;
  minister: string;
  icon: string;
  itemCount: number;
  category: MinistryCategory;
}

export type TextSize = 'sm' | 'md' | 'lg';

export type ActiveTab = 'Overview' | 'Ministries' | 'Intelligence' | 'Compare' | 'Login' | 'Upload';

export interface PillarStat {
  pillar: string;
  count: number;
}

export interface Issue {
  id: string;
  label: string;
  dateRange: string;
  itemsCount: number;
}

// --- Policy Intelligence -----------------------------------------------

export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type LowiType = 'regulatory' | 'distributive' | 'redistributive';
export type SCTPQuadrant = 'advantaged' | 'contender' | 'dependent' | 'deviant';
export type LifecycleStage =
  | 'Problem Identification & Agenda Setting'
  | 'Policy Formulation'
  | 'Legitimation & Adoption'
  | 'Implementation'
  | 'Evaluation'
  | 'Maintenance, Succession & Termination';
export type Severity = 'low' | 'medium' | 'high';

export interface LowiResult {
  regulatory_score: number;
  distributive_score: number;
  redistributive_score: number;
  dominant_type: LowiType;
  reasoning: string;
  confidence: ConfidenceLevel;
}

export interface SCTPGroupResult {
  group_name: string;
  quadrant: SCTPQuadrant;
  power_score: number;
  construction_score: number;
  rationale: string;
  confidence: ConfidenceLevel;
}

export interface SCTPResult {
  groups: SCTPGroupResult[];
  overall_reasoning: string;
}

export interface EngagementResult {
  educate_score: number;
  persuade_score: number;
  coerce_score: number;
  strengthen_score: number;
  incentivize_score: number;
  reasoning: string;
  confidence: ConfidenceLevel;
}

export interface LifecycleResult {
  current_stage: LifecycleStage;
  reasoning: string;
  confidence: ConfidenceLevel;
}

export interface BlindSpot {
  description: string;
  affected_group: string;
  severity: Severity;
}

export interface ImplementationResult {
  street_level_bureaucrats: string[];
  blind_spots: BlindSpot[];
  reasoning: string;
  confidence: ConfidenceLevel;
}

export interface LindblomResult {
  score: number;
  reasoning: string;
  confidence: ConfidenceLevel;
}

export interface SourceCitation {
  title: string;
  url: string;
  snippet: string;
  query: string;
}

export interface PolicyIntelligence {
  generated_at: string;
  model: string;
  lowi: LowiResult;
  sctp: SCTPResult;
  engagement: EngagementResult;
  lifecycle: LifecycleResult;
  implementation: ImplementationResult;
  lindblom: LindblomResult;
  sources: SourceCitation[];
}

export interface IntelligenceStatus {
  status: 'pending' | 'ready';
  intelligence: PolicyIntelligence | null;
}

export interface SCTPAggregatePoint {
  item_id: string;
  item_title: string;
  ministry: string;
  pillar: string;
  group_name: string;
  quadrant: SCTPQuadrant;
  power_score: number;
  construction_score: number;
}

export interface SCTPAggregate {
  points: SCTPAggregatePoint[];
  sample_size: number;
  truncated: boolean;
}

export interface EngagementAggregate {
  avg_educate: number;
  avg_persuade: number;
  avg_coerce: number;
  avg_strengthen: number;
  avg_incentivize: number;
  sample_size: number;
}

export interface LifecycleStageCount {
  stage: string;
  count: number;
}

export interface LifecycleAggregate {
  distribution: LifecycleStageCount[];
  sample_size: number;
}

export interface LowiAggregate {
  avg_regulatory: number;
  avg_distributive: number;
  avg_redistributive: number;
  sample_size: number;
}

export interface EngagementBreakdownRow {
  label: string;
  avg_educate: number;
  avg_persuade: number;
  avg_coerce: number;
  avg_strengthen: number;
  avg_incentivize: number;
  sample_size: number;
}

export interface EngagementBreakdown {
  group_by: 'ministry' | 'pillar';
  rows: EngagementBreakdownRow[];
}

export interface MomentumSeriesPoint {
  issue_label: string;
  count: number;
}

export interface MomentumEntry {
  label: string;
  latest_count: number;
  previous_count: number;
  delta_pct: number | null;
  trend_slope: number;
  series: MomentumSeriesPoint[];
}

export interface Momentum {
  themes: MomentumEntry[];
  ministries: MomentumEntry[];
  latest_issue_label: string;
  previous_issue_label: string;
}

export type EvolutionStageSource = 'dashboard' | 'research';

export interface EvolutionStage {
  label: string;
  year: string;
  description: string;
  source: EvolutionStageSource;
  item_id?: string | null;
}

export interface EvolutionSource {
  title: string;
  url: string;
  snippet: string;
  query: string;
}

export interface PolicyEvolutionChain {
  id: string;
  theme_label: string;
  stages: EvolutionStage[];
  synthesis: string;
  sources: EvolutionSource[];
  generated_at: string;
  model: string;
}

export interface ItemEvolution {
  theme_label: string;
  stages: EvolutionStage[];
  synthesis: string;
  sources: EvolutionSource[];
  generated_at: string;
  model: string;
}

export interface ItemEvolutionStatus {
  status: 'pending' | 'ready';
  evolution: ItemEvolution | null;
}

export interface IntelligenceFilters {
  issue_id?: string;
  ministry_id?: string;
  pillar?: string;
}

// --- Governance Intelligence (Kingdon Streams, PET, Entrepreneurs, Wickedness, Genome) ---

export type PunctuatedEquilibriumStage =
  | 'Policy Monopoly (Stasis)'
  | 'Image Erosion & Venue Shopping'
  | 'Positive Feedback Punctuation'
  | 'New Equilibrium (Post-Punctuation)';

export interface StreamsResult {
  problem_score: number;
  policy_score: number;
  politics_score: number;
  window_open: boolean;
  reasoning: string;
  confidence: ConfidenceLevel;
}

export interface PolicyEntrepreneur {
  actor: string;
  influence: number;
  contribution: string;
}

export interface EntrepreneursResult {
  entrepreneurs: PolicyEntrepreneur[];
  reasoning: string;
  confidence: ConfidenceLevel;
}

export interface PunctuatedEquilibriumResult {
  stage: PunctuatedEquilibriumStage;
  reasoning: string;
  confidence: ConfidenceLevel;
}

export interface WickednessDimensions {
  implementation_complexity: number;
  political_conflict: number;
  federal_coordination: number;
  scientific_uncertainty: number;
  behaviour_change: number;
  time_horizon: number;
  cross_sector: number;
}

export interface WickednessResult {
  dimensions: WickednessDimensions;
  overall_score: number;
  reasoning: string;
  brief: string;
  confidence: ConfidenceLevel;
}

export interface GovernanceGenome {
  vector: number[];
  dimensions: string[];
  reasoning: string;
  brief: string;
  confidence: ConfidenceLevel;
}

export interface PolicyGovernance {
  generated_at: string;
  model: string;
  streams: StreamsResult;
  entrepreneurs: EntrepreneursResult;
  punctuated_equilibrium: PunctuatedEquilibriumResult;
  wickedness: WickednessResult;
  genome: GovernanceGenome;
  research_brief: string;
  synthesis_conclusion: string;
  sources: SourceCitation[];
}

export interface GovernanceStatus {
  status: 'pending' | 'ready';
  governance: PolicyGovernance | null;
}

export interface TypologyMix {
  avg_regulatory: number;
  avg_distributive: number;
  avg_redistributive: number;
}

export interface InstrumentMix {
  avg_educate: number;
  avg_persuade: number;
  avg_coerce: number;
  avg_strengthen: number;
  avg_incentivize: number;
}

export interface Fingerprint {
  label: string;
  avg_genome_vector: number[];
  genome_dimensions: string[];
  avg_wickedness: number;
  typology_mix: TypologyMix;
  instrument_mix: InstrumentMix;
  incremental_pct: number;
  transformational_pct: number;
  stakeholder_diversity: number;
  sample_size: number;
}

export type CompareType = 'policy' | 'ministry' | 'sector';

export interface CompareEntry {
  id: string;
  label: string;
  intelligence: PolicyIntelligence | null;
  governance: PolicyGovernance | null;
  fingerprint: Fingerprint | null;
}

export interface CompareGovernanceResult {
  type: CompareType;
  entry_a: CompareEntry;
  entry_b: CompareEntry;
}
