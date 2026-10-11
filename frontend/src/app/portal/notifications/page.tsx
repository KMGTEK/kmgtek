import type { Metadata } from 'next';

import { NotificationsClient } from '@/app/portal/notifications/_components/notifications-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Notifications',
  path: '/portal/notifications',
  noIndex: true,
});

export default function PortalNotificationsPage() {
  return <NotificationsClient />;
}
