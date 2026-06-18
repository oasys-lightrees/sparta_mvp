// Centralized API client — the ONLY place that calls fetch().
// Handles base URL, JSON parsing, JWT injection and the { success, data }
// response envelope. Domain services (*.api.ts) build on top of this.

import { getToken } from '@/lib/storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
