'use client'

// Token store — in memory only, never localStorage
let accessToken: string | null = null;
let onRefreshCallback: (() => Promise<string | null>) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setRefreshCallback(fn: () => Promise<string | null>) {
  onRefreshCallback = fn;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}/api/v1${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // If 401 and we have a refresh callback, attempt silent refresh
  if (res.status === 401 && onRefreshCallback) {
    const newToken = await onRefreshCallback();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      const retried = await fetch(url, {
        method: options.method || 'GET',
        headers,
        credentials: 'include',
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (!retried.ok) {
        const error = await retried.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${retried.status}`);
      }
      return retried.json();
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
