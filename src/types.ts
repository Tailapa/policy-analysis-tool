export type Pillar = string;

export type Status = 'Initiated' | 'Completed' | 'Announced';

export type Impact = 'High' | 'Medium' | 'Low';

export interface Source {
  label: string;
  url: string;
}

export type MinistryCategory = 'ministry' | 'regulatory_body';

export interface MinistryRef {
  id: string;
  name: string;
  category: MinistryCategory;
}

export interface DraftVerification {
  stillDraft: boolean;
  reasoning: string;
  sourceCount: number;
  generatedAt: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  ministry: string;
  linkedMinistries: MinistryRef[];
  theme: Pillar;
  status: Status;
  impact: Impact;
  date: string; // e.g. '16 Jun', '17 Jun', etc.
  dateValue: number; // For sorting and timeline (day in June 2026, e.g. 16, 17...)
  geography: string; // 'national' or 'state: StateName'
  sources: Source[];
  tags: string[];
  isDraft: boolean;
  draftVerification: DraftVerification | null;
}

export interface Ministry {
  id: string;
  name: string;
  minister: string;
  icon: string;
  itemCount: number;
  category: MinistryCategory;
}

export type TextSize = 'sm' | 'md' | 'lg';

export type ActiveTab = 'Overview' | 'Ministries' | 'RegulatoryBodies' | 'Drafts' | 'Login' | 'Upload';

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

// --- Policy Evolution (PDF-only, per-item) --------------------------------

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
