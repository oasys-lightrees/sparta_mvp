import { notFound } from 'next/navigation';
import { fetchBrandedConfig } from '@/lib/branded-config';
import { BrandedTake } from '@/components/branded/BrandedTake';

export const dynamic = 'force-dynamic';

export default async function BrandedStartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await fetchBrandedConfig(id);
  if (!app) notFound();
  return <BrandedTake app={app} assessmentId={id} />;
}
