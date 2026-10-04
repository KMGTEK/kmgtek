import {
  BriefcaseIcon,
  CalendarIcon,
  CheckCircle2Icon,
  MapPinIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from '@kmg/shared';

import { JobCard } from '@/app/careers/_components/job-card';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { Reveal } from '@/components/motion/reveal';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { JsonLd } from '@/components/shared/json-ld';
import { RichText } from '@/components/shared/rich-text';
import { ShareButtons } from '@/components/shared/share-buttons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getJob } from '@/lib/api/public';
import { breadcrumbJsonLd, buildMetadata, jobPostingJsonLd } from '@/lib/seo';
import { formatDate, formatSalaryRange } from '@/lib/utils';

interface JobPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job || job.status !== 'PUBLISHED') return buildMetadata({ title: 'Job not found', path: `/careers/${slug}`, noIndex: true });
  return buildMetadata({
    title: job.title,
    description: job.seoDescription || job.summary,
    path: `/careers/${job.slug}`,
    type: 'article',
    keywords: job.skills,
  });
}

export default async function JobDetailPage({ params }: JobPageProps) {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job || job.status !== 'PUBLISHED') notFound();

  const salary = formatSalaryRange(job);

  return (
    <>
      <JsonLd
        data={[
          jobPostingJsonLd(job),
          breadcrumbJsonLd([
            { name: 'Home', href: '/' },
            { name: 'Careers', href: '/careers' },
            { name: job.title, href: `/careers/${job.slug}` },
          ]),
        ]}
      />

      <Section spacing="sm" variant="grid">
        <Reveal>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {job.department ? <Badge variant="outline">{job.department.name}</Badge> : null}
                <Badge variant="outline">{WORK_MODE_LABELS[job.workMode]}</Badge>
                <Badge variant="outline">{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
              </div>
              <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {job.title}
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl text-pretty">{job.summary}</p>

              <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <MapPinIcon className="size-3.5" /> Location
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{job.location}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <UsersIcon className="size-3.5" /> Experience
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {job.experienceMax ? `${job.experienceMin}–${job.experienceMax} yrs` : `${job.experienceMin}+ yrs`}
                  </dd>
                </div>
                {salary ? (
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <WalletIcon className="size-3.5" /> Compensation
                    </dt>
                    <dd className="mt-1 text-sm font-medium">{salary}</dd>
                  </div>
                ) : null}
                {job.closingDate ? (
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <CalendarIcon className="size-3.5" /> Apply by
                    </dt>
                    <dd className="mt-1 text-sm font-medium">{formatDate(job.closingDate, 'long')}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
              <Button asChild size="lg" variant="gradient">
                <Link href={`/careers/${job.slug}/apply`}>
                  <BriefcaseIcon className="size-4" /> Apply for this role
                </Link>
              </Button>
              <ShareButtons url={`/careers/${job.slug}`} title={job.title} summary={job.summary} />
            </div>
          </div>
        </Reveal>
      </Section>

      <Section spacing="sm">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-10">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">About the role</h2>
              <RichText html={job.description} className="mt-4" />
            </div>

            {job.responsibilities.length ? (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">Responsibilities</h2>
                <ul className="mt-4 space-y-2.5">
                  {job.responsibilities.map((item, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed">
                      <CheckCircle2Icon className="text-brand-600 dark:text-brand-400 mt-0.5 size-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {job.requirements.length ? (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">Requirements</h2>
                <ul className="mt-4 space-y-2.5">
                  {job.requirements.map((item, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed">
                      <CheckCircle2Icon className="text-brand-600 dark:text-brand-400 mt-0.5 size-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {job.preferredSkills.length ? (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">Nice to have</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.preferredSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {job.benefits.length ? (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">Benefits</h2>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed">
                      <CheckCircle2Icon className="text-ember-600 dark:text-ember-400 mt-0.5 size-4 shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {job.hiringProcess.length ? (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">Hiring process</h2>
                <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {job.hiringProcess.map((step, index) => (
                    <li key={step.title} className="relative pl-9">
                      <span className="bg-brand-500 absolute top-0 left-0 grid size-6 place-items-center rounded-full text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{step.description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="gap-3 p-5">
              <h3 className="font-display text-sm font-semibold tracking-wide uppercase">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
            {job.hiringManager ? (
              <Card className="gap-1 p-5">
                <h3 className="font-display text-sm font-semibold tracking-wide uppercase">Hiring manager</h3>
                <p className="text-sm">{job.hiringManager.name}</p>
              </Card>
            ) : null}
            <Button asChild size="lg" variant="gradient" className="w-full">
              <Link href={`/careers/${job.slug}/apply`}>Apply now</Link>
            </Button>
          </aside>
        </div>
      </Section>

      {job.similar.length ? (
        <Section variant="muted" eyebrow="Related" title="Similar roles">
          <Stagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {job.similar.map((similar) => (
              <StaggerItem key={similar.id}>
                <JobCard job={similar} />
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      ) : null}

      <Section spacing="sm">
        <Container size="prose" className="text-center">
          <h2 className="font-display text-xl font-semibold tracking-tight">Ready to apply?</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            It takes about five minutes — you can save time by signing in first if you have an account.
          </p>
          <Button asChild size="lg" variant="gradient" className="mt-5">
            <Link href={`/careers/${job.slug}/apply`}>Apply for {job.title}</Link>
          </Button>
        </Container>
      </Section>
    </>
  );
}
