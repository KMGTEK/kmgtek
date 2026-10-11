import type { Metadata } from 'next';

import { ApplicationDetailClient } from '@/app/portal/applications/[id]/_components/application-detail-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Application details',
  path: '/portal/applications',
  noIndex: true,
});

export default async function PortalApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApplicationDetailClient id={id} />;
}
