import { Item, Ministry, Issue } from './types';

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
