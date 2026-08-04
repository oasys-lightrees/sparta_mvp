import { notFound } from 'next/navigation';
import { fetchBrandedConfig } from '@/lib/branded-config';
import { BrandedRedeem } from '@/components/branded/BrandedRedeem';

export const dynamic = 'force-dynamic';

export default async function BrandedRedeemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await fetchBrandedConfig(id);
  if (!app) notFound();
  return <BrandedRedeem app={app} assessmentId={id} />;
}
