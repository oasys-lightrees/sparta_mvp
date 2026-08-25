import { notFound } from 'next/navigation';
import { fetchBrandedConfig } from '@/lib/branded-config';
import { BrandedUnlock } from '@/components/branded/BrandedUnlock';

export const dynamic = 'force-dynamic';

export default async function BrandedUnlockPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const app = await fetchBrandedConfig(id);
  if (!app) notFound();
  return <BrandedUnlock app={app} assessmentId={id} attemptId={attemptId} />;
}
