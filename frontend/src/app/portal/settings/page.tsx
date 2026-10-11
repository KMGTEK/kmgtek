import type { Metadata } from 'next';

import { SettingsClient } from '@/app/portal/settings/_components/settings-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Settings',
  path: '/portal/settings',
  noIndex: true,
});

export default function PortalSettingsPage() {
  return <SettingsClient />;
}
