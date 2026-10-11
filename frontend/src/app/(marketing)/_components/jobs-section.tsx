import { ArrowRightIcon, BriefcaseIcon } from 'lucide-react';
import Link from 'next/link';

import type { JobSummary } from '@kmg/shared';

import { Section } from '@/components/layout/section';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { JobCard } from '@/components/marketing';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';

export function JobsSection({ jobs }: { jobs: JobSummary[] }) {
  return (
    <Section
      eyebrow="Join us"
      title="Current openings"
      description="We're hiring engineers who want to do their best work for clients who value it."
      action={
        <Button asChild variant="soft">
          <Link href="/careers">
            All open roles <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      }
    >
      {jobs.length ? (
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.slice(0, 6).map((job) => (
            <StaggerItem key={job.slug}>
              <JobCard job={job} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState
          icon={<BriefcaseIcon className="size-5" />}
          title="No open roles right now"
          description="We're not actively hiring at the moment — check back soon or send us your resume anyway."
          action={
            <Button asChild variant="outline">
              <Link href="/careers">Visit careers</Link>
            </Button>
          }
        />
      )}
    </Section>
  );
}
