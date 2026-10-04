import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ApplyForm } from '@/app/careers/[slug]/apply/_components/apply-form';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { JsonLd } from '@/components/shared/json-ld';
import { getJob } from '@/lib/api/public';
import { breadcrumbJsonLd, buildMetadata } from '@/lib/seo';

interface ApplyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ApplyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  return buildMetadata({
    title: job ? `Apply — ${job.title}` : 'Apply',
    path: `/careers/${slug}/apply`,
    noIndex: true,
  });
}

export default async function JobApplyPage({ params }: ApplyPageProps) {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job || job.status !== 'PUBLISHED') notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'Careers', href: '/careers' },
          { name: job.title, href: `/careers/${job.slug}` },
          { name: 'Apply', href: `/careers/${job.slug}/apply` },
        ])}
      />

      <Section spacing="sm" variant="grid">
        <Container size="prose">
          <p className="text-primary-text dark:text-brand-300 text-xs font-semibold tracking-[0.16em] uppercase">
            Apply for
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{job.title}</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            {job.location} · {job.department?.name ?? 'KMG Technologies'} ·{' '}
            <Link href={`/careers/${job.slug}`} className="text-primary-text dark:text-brand-300 font-medium">
              View full job description
            </Link>
          </p>
        </Container>
      </Section>

      <Section spacing="sm">
        <Container size="prose">
          <ApplyForm job={job} />
        </Container>
      </Section>
    </>
  );
}
