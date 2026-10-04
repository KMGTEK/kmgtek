'use client';

import { useQuery } from '@tanstack/react-query';
import { BriefcaseIcon, CpuIcon, SearchIcon, SparklesIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import type { SearchResults as SearchResultsData } from '@kmg/shared';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { CardGridSkeleton } from '@/components/shared/loading-skeletons';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';

interface ResultGroup {
  key: keyof SearchResultsData;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const GROUPS: ResultGroup[] = [
  { key: 'services', title: 'Services', icon: SparklesIcon },
  { key: 'jobs', title: 'Open roles', icon: BriefcaseIcon },
  { key: 'technologies', title: 'Technologies', icon: CpuIcon },
];

function hrefFor(group: keyof SearchResultsData, slug: string) {
  switch (group) {
    case 'services':
      return `/services/${slug}`;
    case 'jobs':
      return `/careers/${slug}`;
    case 'technologies':
      return `/technologies#${slug}`;
    default:
      return '/';
  }
}

export function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [term, setTerm] = React.useState(q);

  React.useEffect(() => setTerm(q), [q]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.search(q),
    queryFn: () => api.getData<SearchResultsData>('/search', { query: { q, limit: 10 } }),
    enabled: q.trim().length >= 2,
  });

  const totalResults = data ? data.jobs.length + data.services.length + data.technologies.length : 0;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (term.trim()) params.set('q', term.trim());
    else params.delete('q');
    window.history.pushState(null, '', `/search${params.toString() ? `?${params.toString()}` : ''}`);
    void refetch();
  }

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} className="relative mx-auto max-w-xl">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" aria-hidden />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search services, jobs, technologies…"
          className="h-12 pl-10"
          autoFocus
        />
      </form>

      {q.trim().length < 2 ? (
        <EmptyState
          icon={<SearchIcon className="size-5" />}
          title="Start typing to search"
          description="Enter at least 2 characters to search across services, jobs and technologies."
        />
      ) : isLoading ? (
        <CardGridSkeleton count={6} />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : totalResults === 0 ? (
        <EmptyState
          icon={<SearchIcon className="size-5" />}
          title={`No results for "${q}"`}
          description="Try a different search term, or browse services and careers directly."
        />
      ) : (
        <div className="space-y-10">
          {GROUPS.map((group) => {
            const items = data?.[group.key] ?? [];
            if (!items.length) return null;
            return (
              <div key={group.key}>
                <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold">
                  <group.icon className="text-primary-text dark:text-brand-300 size-5" aria-hidden />
                  {group.title}
                  <span className="text-muted-foreground text-sm font-normal">({items.length})</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((item) => {
                    const record = item as { id: string; slug: string; title?: string; name?: string };
                    const label = record.title ?? record.name ?? record.slug;
                    const description =
                      'shortDescription' in item
                        ? (item as { shortDescription?: string }).shortDescription
                        : 'excerpt' in item
                          ? (item as { excerpt?: string }).excerpt
                          : 'location' in item
                            ? (item as { location?: string }).location
                            : 'categoryName' in item
                              ? (item as { categoryName?: string }).categoryName
                              : undefined;
                    return (
                      <Link key={record.id} href={hrefFor(group.key, record.slug)} className="focus-ring block rounded-xl">
                        <Card className="hover:border-brand-300 hover:shadow-soft h-full gap-1 p-4 transition-all">
                          <p className="text-sm font-semibold">{label}</p>
                          {description ? (
                            <p className="text-muted-foreground line-clamp-2 text-xs">{description}</p>
                          ) : null}
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
