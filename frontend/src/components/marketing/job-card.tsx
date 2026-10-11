import { BriefcaseIcon, MapPinIcon } from 'lucide-react';
import Link from 'next/link';

import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, type JobSummary } from '@kmg/shared';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatSalaryRange } from '@/lib/utils';

export interface JobCardProps {
  job: JobSummary;
}

/** Job teaser card — home page "Current openings" and careers listing reuse this shape. */
export function JobCard({ job }: JobCardProps) {
  const salary = formatSalaryRange(job);
  return (
    <Link href={`/careers/${job.slug}`} className="focus-ring group block h-full rounded-xl">
      <Card className="hover:border-brand-300 hover:shadow-lift h-full gap-2.5 p-5 transition-all duration-300">
        <h3 className="font-display group-hover:text-primary-text text-base font-semibold dark:group-hover:text-brand-300">
          {job.title}
        </h3>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="size-3.5" aria-hidden />
            {job.location} · {WORK_MODE_LABELS[job.workMode]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BriefcaseIcon className="size-3.5" aria-hidden />
            {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {job.department ? <Badge variant="outline">{job.department.name}</Badge> : null}
          {salary ? <Badge variant="secondary">{salary}</Badge> : null}
        </div>
      </Card>
    </Link>
  );
}
