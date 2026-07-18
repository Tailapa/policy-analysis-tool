import {
  Item,
  Ministry,
  MinistryCategory,
  Issue,
  ItemEvolutionStatus,
  PillarStat,
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
    const params = new URLSearchParams({ ...baseParams, page: String(page), page_size: '1000' });
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

export async function fetchItem(itemId: string): Promise<Item> {
  return request<Item>(`/api/items/${itemId}`);
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
  filename: string;
  success: boolean;
  issue_id?: string;
  issue_label?: string;
  items: Item[];
  item_count: number;
  error?: string;
}

export interface BulkIssueUploadResult {
  results: IssueUploadResult[];
}

// Accepts one or more .pdf files in one batch — each is ingested as its own
// issue; a failure on one file doesn't prevent the others from publishing
// (see per-result `success`/`error`).
export async function uploadIssueFiles(files: File[]): Promise<BulkIssueUploadResult> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return request<BulkIssueUploadResult>('/api/admin/issues/upload', {
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

export async function deleteItem(itemId: string): Promise<void> {
  return request<void>(`/api/admin/items/${itemId}`, { method: 'DELETE' });
}

export async function updateItemMinistries(
  itemId: string,
  payload: { ministry_id: string; additional_ministry_ids: string[] }
): Promise<Item> {
  return request<Item>(`/api/admin/items/${itemId}/ministries`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// --- Admin: Ministries / Regulatory Bodies --------------------------------

export async function adminListMinistries(): Promise<Ministry[]> {
  return request<Ministry[]>('/api/admin/ministries');
}

export interface MinistryPayload {
  name: string;
  minister_name?: string;
  department?: string;
  seal_url?: string;
  icon?: string;
  category?: MinistryCategory;
}

export async function createMinistry(payload: MinistryPayload): Promise<Ministry> {
  return request<Ministry>('/api/admin/ministries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateMinistry(
  ministryId: string,
  payload: Partial<MinistryPayload>
): Promise<Ministry> {
  return request<Ministry>(`/api/admin/ministries/${ministryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteMinistry(ministryId: string): Promise<void> {
  return request<void>(`/api/admin/ministries/${ministryId}`, { method: 'DELETE' });
}

export async function mergeMinistry(ministryId: string, targetId: string): Promise<{ items_moved: number }> {
  return request<{ items_moved: number }>(`/api/admin/ministries/${ministryId}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_id: targetId }),
  });
}

// --- Themes / Pillars ------------------------------------------------------

export async function fetchPillars(): Promise<string[]> {
  return request<string[]>('/api/pillars');
}

export interface PillarRecord {
  id: string;
  name: string;
}

export async function adminListPillars(): Promise<PillarRecord[]> {
  return request<PillarRecord[]>('/api/admin/pillars');
}

export async function createPillar(name: string): Promise<PillarRecord> {
  return request<PillarRecord>('/api/admin/pillars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function deletePillar(pillarId: string): Promise<void> {
  return request<void>(`/api/admin/pillars/${pillarId}`, { method: 'DELETE' });
}

// --- Policy Evolution (PDF-only, per-item) --------------------------------

export async function fetchPillarStats(): Promise<PillarStat[]> {
  return request<PillarStat[]>('/api/stats/pillars');
}

export async function fetchItemEvolution(itemId: string): Promise<ItemEvolutionStatus> {
  return request<ItemEvolutionStatus>(`/api/items/${itemId}/evolution`);
}

export async function triggerItemEvolutionGeneration(itemId: string, force = false): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/admin/items/${itemId}/generate-evolution?force=${force}`, {
    method: 'POST',
  });
}

// --- File downloads (issue PDFs, generated policy/report PDFs) -----------

async function downloadFile(path: string, options: RequestInit = {}): Promise<void> {
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

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'download';

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadIssuePdf(issueId: string): Promise<void> {
  return downloadFile(`/api/issues/${issueId}/pdf`);
}

export async function downloadIssuesZip(issueIds: string[]): Promise<void> {
  return downloadFile(`/api/issues/pdf/bulk?issue_ids=${issueIds.map(encodeURIComponent).join(',')}`);
}

export async function downloadItemPdf(itemId: string): Promise<void> {
  return downloadFile(`/api/items/${itemId}/pdf`);
}

export async function downloadItemsReportPdf(
  itemIds: string[],
  reportTitle: string,
  reportSubtitle?: string
): Promise<void> {
  return downloadFile('/api/items/pdf-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_ids: itemIds, report_title: reportTitle, report_subtitle: reportSubtitle }),
  });
}
