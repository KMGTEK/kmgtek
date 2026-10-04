'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkXIcon, MapPinIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, type JobSummary } from '@kmg/shared';

import { CardGridSkeleton } from '@/components/shared/loading-skeletons';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';

export function SavedJobsClient() {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading, error, refetch } = useQuery({
    queryKey: qk.me.savedJobs,
    queryFn: () => api.getData<JobSummary[]>('/me/saved-jobs'),
  });

  const unsaveMutation = useMutation({
    mutationFn: (jobId: string) => api.delete(`/me/saved-jobs/${jobId}`),
    onSuccess: () => {
      toast.success('Removed from saved jobs');
      void queryClient.invalidateQueries({ queryKey: qk.me.savedJobs });
      void queryClient.invalidateQueries({ queryKey: qk.me.dashboard });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Saved Jobs" description="Roles you've bookmarked to revisit later." />

      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState
          icon={<BookmarkXIcon className="size-5" />}
          title="No saved jobs"
          description="Save roles you're interested in while browsing careers to find them here later."
          action={
            <Button asChild>
              <Link href="/careers">Browse open roles</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} className="gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/careers/${job.slug}`} className="font-display text-base font-semibold hover:underline">
                    {job.title}
                  </Link>
                  {job.department ? <p className="text-muted-foreground text-sm">{job.department.name}</p> : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove from saved jobs"
                  disabled={unsaveMutation.isPending}
                  onClick={() => unsaveMutation.mutate(job.id)}
                >
                  <BookmarkXIcon className="size-4" />
                </Button>
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="flex items-center gap-1">
                  <MapPinIcon className="size-3.5" /> {job.location}
                </span>
                <span>{WORK_MODE_LABELS[job.workMode]}</span>
                <span>{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</span>
              </div>
              <Button asChild size="sm" variant="outline" className="w-fit">
                <Link href={`/careers/${job.slug}/apply`}>Apply now</Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
