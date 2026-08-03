import { notFound } from 'next/navigation';
import { fetchBrandedConfig } from '@/lib/branded-config';
import { BrandedDashboard } from '@/components/branded/BrandedDashboard';

export const dynamic = 'force-dynamic';

export default async function BrandedDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await fetchBrandedConfig(id);
  if (!app) notFound();
  return <BrandedDashboard app={app} assessmentId={id} />;
}
