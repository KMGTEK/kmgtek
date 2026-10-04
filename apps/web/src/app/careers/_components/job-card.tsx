import { ArrowRightIcon, BriefcaseIcon, MapPinIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';

import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, type JobSummary } from '@kmg/shared';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatSalaryRange } from '@/lib/utils';

function experienceLabel(job: Pick<JobSummary, 'experienceMin' | 'experienceMax'>) {
  if (job.experienceMax) return `${job.experienceMin}–${job.experienceMax} yrs`;
  return `${job.experienceMin}+ yrs`;
}

/** Public job listing card for `/careers`. */
export function JobCard({ job }: { job: JobSummary }) {
  const salary = formatSalaryRange(job);

  return (
    <Link href={`/careers/${job.slug}`} className="focus-ring block h-full rounded-xl">
      <Card className="hover:border-brand-300 hover:shadow-lift h-full gap-3 p-6 transition-all duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold tracking-tight">{job.title}</h3>
            {job.department ? (
              <p className="text-muted-foreground text-sm">{job.department.name}</p>
            ) : null}
          </div>
          <Badge variant="outline" className="shrink-0">
            {WORK_MODE_LABELS[job.workMode]}
          </Badge>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="size-3.5" aria-hidden />
            {job.location}
          </span>
          <span className="flex items-center gap-1.5">
            <BriefcaseIcon className="size-3.5" aria-hidden />
            {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
          </span>
          <span className="flex items-center gap-1.5">
            <UsersIcon className="size-3.5" aria-hidden />
            {experienceLabel(job)}
          </span>
        </div>

        {job.skills.length ? (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-between">
          {salary ? (
            <span className="text-sm font-medium">{salary}</span>
          ) : (
            <span className="text-muted-foreground text-sm">Competitive compensation</span>
          )}
          <span className="text-primary-text dark:text-brand-300 inline-flex items-center gap-1 text-sm font-medium">
            View role <ArrowRightIcon className="size-3.5" aria-hidden />
          </span>
        </div>
      </Card>
    </Link>
  );
}
