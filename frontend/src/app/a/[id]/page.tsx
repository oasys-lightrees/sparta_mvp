import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrandedLanding } from '@/components/landing/BrandedLanding';
import type { AssessmentApp } from '@/types/assessment-app';

// Branded per-assessment landing ("the assessment as its own product").
// Renders entirely from the assessment's AssessmentApp config (backend
// /api/assessments/:id/app-config). Server-rendered per request.
export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

type Envelope<T> = { success: true; data: T } | { success: false; message: string };

async function fetchConfig(id: string): Promise<AssessmentApp | null> {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const app = await fetchConfig(id);
  if (!app) return { title: 'Assessment' };
  return {
    title: app.seo.title || app.brand.brandName,
    description: app.seo.description,
    keywords: app.seo.keywords,
    openGraph: {
      title: app.seo.title || app.brand.brandName,
      description: app.seo.description,
      images: app.seo.ogImageUrl ? [app.seo.ogImageUrl] : undefined,
    },
    icons: app.brand.faviconUrl ? { icon: app.brand.faviconUrl } : undefined,
  };
}

export default async function BrandedAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await fetchConfig(id);
  if (!app) notFound();
  return (
    <BrandedLanding
      app={app}
      startHref={`/assessments/${id}`}
      loginHref="/login"
    />
  );
}
