import { notFound } from 'next/navigation';
import { fetchBrandedConfig } from '@/lib/branded-config';
import { BrandedReport } from '@/components/branded/BrandedReport';

export const dynamic = 'force-dynamic';

export default async function BrandedReportPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const app = await fetchBrandedConfig(id);
  if (!app) notFound();
  return <BrandedReport app={app} assessmentId={id} attemptId={attemptId} />;
}
