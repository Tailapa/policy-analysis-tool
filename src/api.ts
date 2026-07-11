import {
  Item,
  Ministry,
  Issue,
  IntelligenceStatus,
  SCTPAggregate,
  EngagementAggregate,
  LifecycleAggregate,
  LowiAggregate,
  IntelligenceFilters,
  GovernanceStatus,
  Fingerprint,
  CompareType,
  CompareGovernanceResult,
  EngagementBreakdown,
  Momentum,
  PolicyEvolutionChain,
  ItemEvolutionStatus,
} from './types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

const TOKEN_KEY = 'authToken';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore, use statusText
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

interface PaginatedItems {
  items: Item[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export async function fetchIssues(): Promise<Issue[]> {
  return request<Issue[]>('/api/issues?page_size=100');
}

async function fetchAllPages(baseParams: Record<string, string>): Promise<Item[]> {
  const all: Item[] = [];
  let page = 1;
  // Overview/Ministries do their own client-side filter+paginate over the
  // full set, so pull every page up front.
  while (true) {
    const params = new URLSearchParams({ ...baseParams, page: String(page), page_size: '100' });
    const data = await request<PaginatedItems>(`/api/items?${params.toString()}`);
    all.push(...data.items);
    if (page >= data.total_pages) break;
    page += 1;
  }
  return all;
}

export async function fetchItemsForIssue(issueId: string): Promise<Item[]> {
  return fetchAllPages({ issue_id: issueId });
}

export async function fetchAllItems(): Promise<Item[]> {
  return fetchAllPages({});
}

export async function fetchMinistries(): Promise<Ministry[]> {
  return request<Ministry[]>('/api/ministries');
}

export async function login(email: string, password: string): Promise<void> {
  const data = await request<{ access_token: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
}

export interface IssueUploadResult {
  issue_id: string;
  issue_label: string;
  items: Item[];
  item_count: number;
}

export async function uploadIssueFile(file: File): Promise<IssueUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  return request<IssueUploadResult>('/api/admin/issues/upload', {
    method: 'POST',
    body: formData,
  });
}

export interface ManualItemPayload {
  title: string;
  description: string;
  ministry: string;
  theme: Item['theme'];
  status: Item['status'];
  impact: Item['impact'];
  date: string;
  dateValue: number;
  geography: string;
  sources: Item['sources'];
  tags: string[];
  issue_id?: string;
}

export async function createManualItem(payload: ManualItemPayload): Promise<Item> {
  return request<Item>('/api/admin/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// --- Policy Intelligence -----------------------------------------------

export async function fetchItemIntelligence(itemId: string): Promise<IntelligenceStatus> {
  return request<IntelligenceStatus>(`/api/items/${itemId}/intelligence`);
}

export async function triggerIntelligenceGeneration(itemId: string, force = false): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/admin/items/${itemId}/generate-intelligence?force=${force}`, {
    method: 'POST',
  });
}

export async function triggerIntelligenceBackfill(limit = 100): Promise<{ backfilled: number }> {
  return request<{ backfilled: number }>(`/api/admin/intelligence/backfill?limit=${limit}`, {
    method: 'POST',
  });
}

function filtersToQuery(filters?: IntelligenceFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.issue_id) params.set('issue_id', filters.issue_id);
  if (filters.ministry_id) params.set('ministry_id', filters.ministry_id);
  if (filters.pillar) params.set('pillar', filters.pillar);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchSCTPAggregate(filters?: IntelligenceFilters): Promise<SCTPAggregate> {
  return request<SCTPAggregate>(`/api/intelligence/sctp${filtersToQuery(filters)}`);
}

export async function fetchEngagementAggregate(filters?: IntelligenceFilters): Promise<EngagementAggregate> {
  return request<EngagementAggregate>(`/api/intelligence/engagement${filtersToQuery(filters)}`);
}

export async function fetchLifecycleAggregate(filters?: IntelligenceFilters): Promise<LifecycleAggregate> {
  return request<LifecycleAggregate>(`/api/intelligence/lifecycle${filtersToQuery(filters)}`);
}

export async function fetchLowiAggregate(filters?: IntelligenceFilters): Promise<LowiAggregate> {
  return request<LowiAggregate>(`/api/intelligence/lowi${filtersToQuery(filters)}`);
}

export async function fetchEngagementBreakdown(
  groupBy: 'ministry' | 'pillar',
  issueId?: string
): Promise<EngagementBreakdown> {
  const params = new URLSearchParams({ group_by: groupBy });
  if (issueId) params.set('issue_id', issueId);
  return request<EngagementBreakdown>(`/api/intelligence/engagement-breakdown?${params.toString()}`);
}

export async function fetchMomentum(): Promise<Momentum> {
  return request<Momentum>('/api/stats/momentum');
}

export async function fetchPolicyEvolution(): Promise<PolicyEvolutionChain[]> {
  return request<PolicyEvolutionChain[]>('/api/intelligence/evolution');
}

export async function triggerEvolutionGeneration(): Promise<{ status: string }> {
  return request<{ status: string }>('/api/admin/intelligence/generate-evolution', { method: 'POST' });
}

export async function fetchItemEvolution(itemId: string): Promise<ItemEvolutionStatus> {
  return request<ItemEvolutionStatus>(`/api/items/${itemId}/evolution`);
}

export async function triggerItemEvolutionGeneration(itemId: string, force = false): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/admin/items/${itemId}/generate-evolution?force=${force}`, {
    method: 'POST',
  });
}

// --- Governance Intelligence ---------------------------------------------

export async function fetchItemGovernance(itemId: string): Promise<GovernanceStatus> {
  return request<GovernanceStatus>(`/api/items/${itemId}/governance`);
}

export async function triggerGovernanceGeneration(itemId: string, force = false): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/admin/items/${itemId}/generate-governance?force=${force}`, {
    method: 'POST',
  });
}

export async function triggerGovernanceBackfill(limit = 100): Promise<{ backfilled: number }> {
  return request<{ backfilled: number }>(`/api/admin/governance/backfill?limit=${limit}`, {
    method: 'POST',
  });
}

export async function fetchMinistryFingerprint(ministryId: string): Promise<Fingerprint> {
  return request<Fingerprint>(`/api/governance/ministries/${ministryId}/fingerprint`);
}

export async function fetchSectorFingerprint(pillar: string): Promise<Fingerprint> {
  return request<Fingerprint>(`/api/governance/sectors/${encodeURIComponent(pillar)}/fingerprint`);
}

export interface BulkGenerateResult {
  queued_intelligence: number;
  queued_governance: number;
}

export async function triggerMinistryBulkGenerate(ministryId: string): Promise<BulkGenerateResult> {
  return request<BulkGenerateResult>(`/api/admin/ministries/${ministryId}/generate-intelligence`, {
    method: 'POST',
  });
}

export async function fetchGovernanceCompare(
  type: CompareType,
  idA: string,
  idB: string
): Promise<CompareGovernanceResult> {
  const params = new URLSearchParams({ type, id_a: idA, id_b: idB });
  return request<CompareGovernanceResult>(`/api/governance/compare?${params.toString()}`);
}
