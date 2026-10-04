import type { Metadata } from 'next';

import { ProfileClient } from '@/app/portal/profile/_components/profile-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'My Profile',
  path: '/portal/profile',
  noIndex: true,
});

export default function PortalProfilePage() {
  return <ProfileClient />;
}
