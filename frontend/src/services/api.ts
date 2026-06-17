/**
 * Base API client. All frontend API service functions go through this so the
 * standard response envelope ({ success, data } / { success, message }) is
 * handled in one place.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const body = (await res.json()) as ApiResponse<T>;

  if (!body.success) {
    throw new Error(body.message);
  }

  return body.data;
}
