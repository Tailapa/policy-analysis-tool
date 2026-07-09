export type Pillar = 
  | 'Economic Growth'
  | 'Infrastructure'
  | 'Human Development'
  | 'National Security'
  | 'Rural & Agri'
  | 'Misc';

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

export interface Ministry {
  name: string;
  minister: string;
  icon: string;
  itemCount: number;
}

export type TextSize = 'sm' | 'md' | 'lg';

export type ActiveTab = 'Overview' | 'Ministries' | 'Login' | 'Upload';

export interface Issue {
  id: string;
  label: string;
  dateRange: string;
  itemsCount: number;
}
