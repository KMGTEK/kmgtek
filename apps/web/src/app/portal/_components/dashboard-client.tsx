'use client';

import { useQuery } from '@tanstack/react-query';
import { BookmarkIcon, CalendarClockIcon, FileTextIcon, SendIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import type { Interview, JobApplication } from '@kmg/shared';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatsSkeleton } from '@/components/shared/loading-skeletons';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { useAuth } from '@/lib/auth/auth-provider';
import { formatDate } from '@/lib/utils';

interface DashboardData {
  applications: number;
  active: number;
  interviews: number;
  savedJobs: number;
  profileCompleteness: number;
  recentApplications: JobApplication[];
  upcomingInterviews: Interview[];
}

export function DashboardClient() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.me.dashboard,
    queryFn: () => api.getData<DashboardData>('/me/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <StatsSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState error={error} onAction={() => refetch()} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0] ?? 'there'}`}
        description="Here's where things stand with your job search."
        actions={
          <Button asChild variant="gradient">
            <Link href="/careers">Browse open roles</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Applications" value={data.applications} icon="Send" href="/portal/applications" />
        <StatCard label="Active" value={data.active} icon="Loader" tone="ember" href="/portal/applications" />
        <StatCard
          label="Interviews"
          value={data.interviews}
          icon="CalendarClock"
          href="/portal/applications"
        />
        <StatCard label="Saved jobs" value={data.savedJobs} icon="Bookmark" href="/portal/saved-jobs" />
      </div>

      <Card className="gap-3 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Profile completeness</h2>
          <span className="text-muted-foreground text-sm tabular-nums">{data.profileCompleteness}%</span>
        </div>
        <Progress value={data.profileCompleteness} />
        {data.profileCompleteness < 100 ? (
          <p className="text-muted-foreground text-sm">
            A complete profile helps recruiters match you faster.{' '}
            <Link href="/portal/profile" className="text-primary-text dark:text-brand-300 font-medium">
              Finish your profile
            </Link>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">Your profile is complete — nice work.</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Recent applications</h2>
            <Link href="/portal/applications" className="text-primary-text dark:text-brand-300 text-sm font-medium">
              View all
            </Link>
          </div>
          {data.recentApplications.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={<SendIcon className="size-5" />}
              title="No applications yet"
              description="Roles you apply to will show up here."
              action={
                <Button asChild size="sm">
                  <Link href="/careers">Browse roles</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-border -mx-2 divide-y">
              {data.recentApplications.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/portal/applications/${application.id}`}
                    className="hover:bg-accent flex items-center justify-between gap-3 rounded-lg px-2 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{application.job.title}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(application.createdAt)}</p>
                    </div>
                    <StatusBadge kind="application" status={application.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Upcoming interviews</h2>
          </div>
          {data.upcomingInterviews.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={<CalendarClockIcon className="size-5" />}
              title="No interviews scheduled"
              description="You'll see upcoming interviews here once they're scheduled."
            />
          ) : (
            <ul className="space-y-3">
              {data.upcomingInterviews.map((interview) => (
                <li key={interview.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{interview.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(interview.scheduledAt, 'datetime')} · {interview.durationMinutes} min
                  </p>
                  {interview.meetingUrl ? (
                    <a
                      href={interview.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-text dark:text-brand-300 mt-1 inline-block text-xs font-medium"
                    >
                      Join meeting
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/profile">
            <FileTextIcon className="size-4" /> Complete profile
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/resumes">
            <FileTextIcon className="size-4" /> Manage resumes
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/saved-jobs">
            <BookmarkIcon className="size-4" /> Saved jobs
          </Link>
        </Button>
      </div>
    </div>
  );
}
