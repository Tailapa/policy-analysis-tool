export type Pillar = string;

export type Status = 'Initiated' | 'Completed' | 'Announced';

export type Impact = 'High' | 'Medium' | 'Low';

export type Subtype = 'Policy Update' | 'Announcement';

export interface Source {
  label: string;
  url: string;
}

export type MinistryCategory = 'ministry' | 'regulatory_body' | 'misc';

export interface MinistryRef {
  id: string;
  name: string;
  category: MinistryCategory;
}

export interface Item {
  id: string;
  issueId: string;
  title: string;
  description: string;
  ministry: string;
  linkedMinistries: MinistryRef[];
  theme: Pillar;
  subtype: Subtype;
  status: Status | null;
  impact: Impact | null;
  date: string; // e.g. '16 Jun', '17 Jun', etc.
  dateValue: number; // For sorting and timeline (day in June 2026, e.g. 16, 17...)
  sources: Source[];
  tags: string[];
  isDraft: boolean;
  financialOutlay: string | null;
  needsMinistryReview: boolean;
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

export type ActiveTab = 'Overview' | 'Ministries' | 'RegulatoryBodies' | 'Miscellaneous' | 'Drafts' | 'Reports' | 'Login' | 'Upload';

export interface PillarStat {
  pillar: string;
  count: number;
}

export interface Issue {
  id: string;
  label: string;
  dateRange: string;
  itemsCount: number;
  hasPdf: boolean;
  periodStart: string; // ISO date, e.g. '2026-05-16'
}

// --- Policy Evolution (PDF-only, per-item; TF-IDF keyword matching + ------
// templated synthesis, no AI) ------------------------------------------

export type EvolutionStageSource = 'dashboard';

export interface EvolutionStage {
  label: string;
  year: string;
  description: string;
  source: EvolutionStageSource;
  item_id?: string | null;
}

export interface ItemEvolution {
  theme_label: string;
  stages: EvolutionStage[];
  synthesis: string;
  generated_at: string;
  method: string;
}

export interface ItemEvolutionStatus {
  status: 'pending' | 'ready';
  evolution: ItemEvolution | null;
}
