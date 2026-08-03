import type { AssessmentApp } from '@/types/assessment-app';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
type Envelope<T> = { success: true; data: T } | { success: false; message: string };

/** Server-side fetch of a published assessment's branded config. */
export async function fetchBrandedConfig(id: string): Promise<AssessmentApp | null> {
  try {
    const res = await fetch(`${API_URL}/api/assessments/${id}/app-config`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Envelope<AssessmentApp>;
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}
