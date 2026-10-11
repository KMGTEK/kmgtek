import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

import { COMPANY, jobsQuerySchema } from '@kmg/shared';

import { JobCard } from '@/app/careers/_components/job-card';
import { JobFilters, type CareersFilterValues } from '@/app/careers/_components/job-filters';
import { Pager } from '@/app/careers/_components/pager';
import { Container } from '@/components/layout/container';
import { PageHero } from '@/components/layout/page-hero';
import { Section } from '@/components/layout/section';
import { Reveal } from '@/components/motion/reveal';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { EmptyState } from '@/components/shared/empty-state';
import { JsonLd } from '@/components/shared/json-ld';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getContentBlock, getJobFacets, getJobs } from '@/lib/api/public';
import { breadcrumbJsonLd } from '@/lib/seo';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Careers',
  description: `Build your career at ${COMPANY.displayName}. Explore open roles in cloud, DevOps, platform engineering and AI — and see why engineers stay.`,
  path: '/careers',
});

interface CareersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CareersPage({ searchParams }: CareersPageProps) {
  const rawParams = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) flat[key] = firstValue(value);

  const parsed = jobsQuerySchema.safeParse(flat);
  const query = parsed.success ? parsed.data : jobsQuerySchema.parse({});

  const [jobs, facets, intro] = await Promise.all([getJobs(query), getJobFacets(), getContentBlock('careers.intro')]);

  const initialFilters: CareersFilterValues = {
    search: flat.search,
    location: flat.location,
    department: flat.department,
    technology: flat.technology,
    employmentType: flat.employmentType,
    workMode: flat.workMode,
    sort: flat.sort as CareersFilterValues['sort'],
    experienceMin: flat.experienceMin,
    experienceMax: flat.experienceMax,
  };

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'Careers', href: '/careers' },
        ])}
      />

      <PageHero
        eyebrow={intro.heroEyebrow}
        title={
          <>
            {intro.heroTitle} <span className="gradient-text">{intro.heroTitleHighlight}</span>
          </>
        }
        description={intro.heroDescription}
        actions={
          <>
            <Button asChild size="lg" variant="gradient">
              <Link href="#openings">
                View open roles <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/about">Learn about us</Link>
            </Button>
          </>
        }
      />

      {/* Why work with us --------------------------------------------- */}
      <Section eyebrow={intro.whyUsEyebrow} title={intro.whyUsTitle} description={intro.whyUsDescription}>
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {intro.whyUs.map((item) => (
            <StaggerItem key={item.title}>
              <Card className="h-full gap-3 p-6">
                <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300 grid size-11 place-items-center rounded-xl">
                  <DynamicIcon name={item.icon} className="size-5" />
                </span>
                <h3 className="font-display mt-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* Benefits -------------------------------------------------------- */}
      <Section variant="muted" eyebrow={intro.benefitsEyebrow} title={intro.benefitsTitle}>
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {intro.benefits.map((benefit) => (
            <StaggerItem key={benefit.label}>
              <div className="bg-background flex items-center gap-3 rounded-xl border p-4">
                <span className="bg-ember-50 text-ember-700 dark:bg-ember-500/12 dark:text-ember-300 grid size-10 shrink-0 place-items-center rounded-lg">
                  <DynamicIcon name={benefit.icon} className="size-4.5" />
                </span>
                <p className="text-sm font-medium">{benefit.label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* Company culture -------------------------------------------------- */}
      <Section variant="dark" eyebrow={intro.cultureEyebrow} title={intro.cultureTitle}>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <ul className="space-y-4">
              {intro.culturePoints.map((point) => (
                <li key={point} className="text-ink-200 flex items-start gap-3 text-sm leading-relaxed sm:text-base">
                  <span className="bg-brand-500/15 text-brand-400 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
                    ✓
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="border-ink-800 bg-ink-900/60 rounded-2xl border p-8">
              <p className="font-display text-xl leading-relaxed text-balance text-white">&ldquo;{intro.cultureQuote}&rdquo;</p>
              <p className="text-ink-400 mt-4 text-sm">{intro.cultureQuoteAttribution}</p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Current openings -------------------------------------------------- */}
      <Section
        id="openings"
        eyebrow={intro.openingsEyebrow}
        title={intro.openingsTitle}
        description={`${jobs.meta.total} open position${jobs.meta.total === 1 ? '' : 's'} across engineering, platform and delivery.`}
      >
        <div className="space-y-8">
          <JobFilters facets={facets} initial={initialFilters} />

          {jobs.data.length === 0 ? (
            <EmptyState
              title="No roles match those filters"
              description="Try clearing a filter or broadening your search — or check back soon, we post new roles regularly."
              action={
                <Button asChild variant="outline">
                  <Link href="/careers">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <Stagger className="grid gap-5 md:grid-cols-2">
                {jobs.data.map((job) => (
                  <StaggerItem key={job.id}>
                    <JobCard job={job} />
                  </StaggerItem>
                ))}
              </Stagger>
              <Pager meta={jobs.meta} basePath="/careers" currentQuery={{ ...flat, page: undefined }} />
            </>
          )}
        </div>
      </Section>

      {/* CTA --------------------------------------------------------------- */}
      <Section spacing="sm" variant="muted">
        <Container size="prose" className="text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{intro.noRoleTitle}</h2>
          <p className="text-muted-foreground mt-2">{intro.noRoleDescription}</p>
          <Button asChild variant="gradient" size="lg" className="mt-5">
            <Link href="/contact">{intro.noRoleButtonLabel}</Link>
          </Button>
        </Container>
      </Section>
    </>
  );
}
