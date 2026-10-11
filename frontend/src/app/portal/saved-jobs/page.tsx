import type { Metadata } from 'next';

import { SavedJobsClient } from '@/app/portal/saved-jobs/_components/saved-jobs-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Saved Jobs',
  path: '/portal/saved-jobs',
  noIndex: true,
});

export default function PortalSavedJobsPage() {
  return <SavedJobsClient />;
}
