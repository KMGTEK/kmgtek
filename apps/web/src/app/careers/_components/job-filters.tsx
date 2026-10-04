'use client';

import { FilterXIcon, SearchIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPES,
  WORK_MODE_LABELS,
  WORK_MODES,
  type JobFacets,
  type JobsQuery,
} from '@kmg/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import { buildQueryString, cn } from '@/lib/utils';

export type CareersFilterValues = Partial<
  Pick<
    JobsQuery,
    'search' | 'location' | 'department' | 'technology' | 'employmentType' | 'workMode' | 'sort'
  >
> & {
  experienceMin?: string;
  experienceMax?: string;
};

const ANY = '__any__';

/** Search box + facet filters for the `/careers` listing, driven entirely by the URL. */
export function JobFilters({ facets, initial }: { facets: JobFacets; initial: CareersFilterValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = React.useState(initial.search ?? '');
  const selectedWorkModes = React.useMemo(
    () => (initial.workMode ? initial.workMode.split(',').filter(Boolean) : []),
    [initial.workMode],
  );

  const push = React.useCallback(
    (next: Partial<CareersFilterValues>) => {
      const merged: CareersFilterValues = { ...initial, ...next };
      router.push(`${pathname}${buildQueryString({ ...merged, page: undefined })}`);
    },
    [initial, pathname, router],
  );

  const debouncedSearchPush = useDebouncedCallback((value: string) => push({ search: value }), 400);

  const hasActiveFilters = Boolean(
    initial.search ||
      initial.location ||
      initial.department ||
      initial.technology ||
      initial.employmentType ||
      initial.workMode ||
      initial.experienceMin ||
      initial.experienceMax,
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            debouncedSearchPush(event.target.value);
          }}
          placeholder="Search roles, skills, keywords…"
          className="h-11 pl-9"
          aria-label="Search open roles"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Select
          value={initial.location ?? ANY}
          onValueChange={(value) => push({ location: value === ANY ? undefined : value })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[9rem]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All locations</SelectItem>
            {facets.locations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={initial.department ?? ANY}
          onValueChange={(value) => push({ department: value === ANY ? undefined : value })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[9rem]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All departments</SelectItem>
            {facets.departments.map((department) => (
              <SelectItem key={department.id} value={department.slug}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={initial.technology ?? ANY}
          onValueChange={(value) => push({ technology: value === ANY ? undefined : value })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[9rem]">
            <SelectValue placeholder="Technology" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any technology</SelectItem>
            {facets.technologies.map((tech) => (
              <SelectItem key={tech} value={tech}>
                {tech}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={initial.employmentType ?? ANY}
          onValueChange={(value) => push({ employmentType: value === ANY ? undefined : value })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[9rem]">
            <SelectValue placeholder="Employment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any type</SelectItem>
            {(facets.employmentTypes.length ? facets.employmentTypes : EMPLOYMENT_TYPES).map((type) => (
              <SelectItem key={type} value={type}>
                {EMPLOYMENT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            placeholder="Min yrs"
            defaultValue={initial.experienceMin ?? ''}
            onBlur={(event) => push({ experienceMin: event.target.value || undefined })}
            className="h-8 w-20"
            aria-label="Minimum experience (years)"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            min={0}
            placeholder="Max yrs"
            defaultValue={initial.experienceMax ?? ''}
            onBlur={(event) => push({ experienceMax: event.target.value || undefined })}
            className="h-8 w-20"
            aria-label="Maximum experience (years)"
          />
        </div>

        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
            <FilterXIcon className="size-3.5" />
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Work mode</span>
        {(facets.workModes.length ? facets.workModes : WORK_MODES).map((mode) => {
          const active = selectedWorkModes.includes(mode);
          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                const next = active
                  ? selectedWorkModes.filter((m) => m !== mode)
                  : [...selectedWorkModes, mode];
                push({ workMode: next.length ? next.join(',') : undefined });
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'hover:border-brand-400 text-muted-foreground border-border',
              )}
              aria-pressed={active}
            >
              {WORK_MODE_LABELS[mode]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
