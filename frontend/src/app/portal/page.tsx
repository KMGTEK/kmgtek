import type { Metadata } from 'next';

import { DashboardClient } from '@/app/portal/_components/dashboard-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Dashboard',
  path: '/portal',
  noIndex: true,
});

export default function PortalDashboardPage() {
  return <DashboardClient />;
}
