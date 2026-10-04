import type { Metadata } from 'next';

import { ResumesClient } from '@/app/portal/resumes/_components/resumes-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Resumes',
  path: '/portal/resumes',
  noIndex: true,
});

export default function PortalResumesPage() {
  return <ResumesClient />;
}
