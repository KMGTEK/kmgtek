import type { Metadata } from 'next';

import { ApplicationsClient } from '@/app/portal/applications/_components/applications-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'My Applications',
  path: '/portal/applications',
  noIndex: true,
});

export default function PortalApplicationsPage() {
  return <ApplicationsClient />;
}
