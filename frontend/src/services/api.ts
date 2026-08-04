// Centralized API client — the ONLY place that calls fetch().
// Handles base URL, JSON parsing, JWT injection and the { success, data }
// response envelope. Domain services (*.api.ts) build on top of this.

import { getToken } from '@/lib/storage';

// API base URL. Set via NEXT_PUBLIC_API_URL (inlined at build time):
//   production -> https://lato.example.com (same origin via nginx)
//   local dev  -> http://localhost:3001 (see frontend/.env.example)
// Falls back to a relative base ('') so same-origin deployments work even when
// the value is omitted. No hardcoded localhost or IP.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; message: string };

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Connection-level failure (offline, DNS, CORS, server down) — fetch itself
    // rejected. Surface a friendly message instead of a raw "Failed to fetch".
    throw new Error(
      'Network error — please check your connection and try again.',
    );
  }

  let parsed: ApiResponse<T>;
  try {
    parsed = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error('Unexpected server response');
  }

  if (!parsed.success) {
    throw new Error(parsed.message || 'Request failed');
  }

  return parsed.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
