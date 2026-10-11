import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PageHero } from '@/components/layout/page-hero';
import { Section } from '@/components/layout/section';
import { CardGridSkeleton } from '@/components/shared/loading-skeletons';
import { buildMetadata } from '@/lib/seo';

import { SearchResults } from './_components/search-results';

export const metadata: Metadata = buildMetadata({
  title: 'Search',
  description: 'Search services, open roles and technologies at KMG Technologies.',
  path: '/search',
  noIndex: true,
});

export default function SearchPage() {
  return (
    <>
      <PageHero
        eyebrow="Search"
        title="Search KMG Technologies"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Search' }]}
        size="sm"
      />
      <Section>
        <Suspense fallback={<CardGridSkeleton count={6} />}>
          <SearchResults />
        </Suspense>
      </Section>
    </>
  );
}
