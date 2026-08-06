// Image upload service. Uploads go through a dedicated multipart request (the
// shared apiClient only speaks JSON), but reuse the same base URL, auth token
// and { success, data } envelope conventions.

import { getToken } from '@/lib/storage';
import type { ApiResponse } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const uploadApi = {
  /**
   * Upload an image and get back its public URL. The browser sets the multipart
   * Content-Type (with boundary) itself, so we must NOT set it manually.
   */
  async uploadImage(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append('file', file);

    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/uploads`, {
        method: 'POST',
        headers,
        body: form,
      });
    } catch {
      throw new Error(
        'Network error — please check your connection and try again.',
      );
    }

    let parsed: ApiResponse<{ url: string }>;
    try {
      parsed = (await res.json()) as ApiResponse<{ url: string }>;
    } catch {
      throw new Error(
        res.ok
          ? 'Unexpected server response'
          : 'The server is temporarily unavailable. Please try again.',
      );
    }

    if (!parsed.success) {
      throw new Error(parsed.message || 'Upload failed');
    }
    return parsed.data;
  },
};
