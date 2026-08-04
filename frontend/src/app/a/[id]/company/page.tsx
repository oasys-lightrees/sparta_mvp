import { notFound } from 'next/navigation';
import { fetchBrandedConfig } from '@/lib/branded-config';
import { BrandedCompany } from '@/components/branded/BrandedCompany';

export const dynamic = 'force-dynamic';

export default async function BrandedCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await fetchBrandedConfig(id);
  if (!app) notFound();
  return <BrandedCompany app={app} assessmentId={id} />;
}
