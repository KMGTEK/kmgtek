'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BriefcaseIcon,
  CalendarClockIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { toast } from 'sonner';

import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, type JobApplication } from '@kmg/shared';

import { PipelineTimeline } from '@/app/portal/applications/[id]/_components/pipeline-timeline';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DetailSkeleton } from '@/components/shared/loading-skeletons';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { formatDate } from '@/lib/utils';

const WITHDRAWABLE_STATUSES = ['APPLIED', 'UNDER_REVIEW', 'TECHNICAL_ROUND', 'HR_ROUND'];

export function ApplicationDetailClient({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const { data: application, isLoading, error, refetch } = useQuery({
    queryKey: qk.me.application(id),
    queryFn: () => api.getData<JobApplication>(`/me/applications/${id}`),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => api.postData<JobApplication>(`/me/applications/${id}/withdraw`),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.me.application(id), updated);
      void queryClient.invalidateQueries({ queryKey: qk.me.dashboard });
      toast.success('Application withdrawn');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Application" breadcrumbs={[{ label: 'Applications', href: '/portal/applications' }, { label: 'Detail' }]} />
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !application) {
    return <ErrorState error={error} onAction={() => refetch()} />;
  }

  const canWithdraw = WITHDRAWABLE_STATUSES.includes(application.status);
  const isTerminalOffPath = application.status === 'REJECTED' || application.status === 'WITHDRAWN';
  const lastHistory = application.history[application.history.length - 1];

  return (
    <div className="space-y-8">
      <PageHeader
        title={application.job.title}
        breadcrumbs={[{ label: 'Applications', href: '/portal/applications' }, { label: application.job.title }]}
        actions={
          canWithdraw ? (
            <ConfirmDialog
              trigger={<Button variant="outline">Withdraw application</Button>}
              title="Withdraw this application?"
              description="You won't be considered for this role any longer. This can't be undone."
              variant="destructive"
              confirmLabel="Withdraw"
              onConfirm={async () => {
                await withdrawMutation.mutateAsync();
              }}
            />
          ) : undefined
        }
      >
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="size-3.5" /> {application.job.location}
          </span>
          <span className="flex items-center gap-1.5">
            <BriefcaseIcon className="size-3.5" /> {EMPLOYMENT_TYPE_LABELS[application.job.employmentType]} ·{' '}
            {WORK_MODE_LABELS[application.job.workMode]}
          </span>
          <span>Applied {formatDate(application.createdAt, 'long')}</span>
        </div>
      </PageHeader>

      <Card className="gap-4 p-6">
        <PipelineTimeline status={application.status} history={application.history} />
      </Card>

      {isTerminalOffPath ? (
        <Alert variant={application.status === 'REJECTED' ? 'destructive' : 'default'}>
          <AlertTitle>
            {application.status === 'REJECTED' ? 'Application not selected' : 'Application withdrawn'}
          </AlertTitle>
          <AlertDescription>
            {lastHistory?.note ||
              (application.status === 'REJECTED'
                ? "This application isn't moving forward, but we'd love to see you apply again in the future."
                : 'You withdrew this application.')}
          </AlertDescription>
        </Alert>
      ) : null}

      {application.interviews && application.interviews.length > 0 ? (
        <Card className="gap-4 p-6">
          <h2 className="font-display flex items-center gap-2 text-base font-semibold">
            <CalendarClockIcon className="size-4" /> Upcoming interviews
          </h2>
          <ul className="space-y-3">
            {application.interviews.map((interview) => (
              <li key={interview.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{interview.title}</p>
                  <Badge variant="outline">{interview.round}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatDate(interview.scheduledAt, 'datetime')} · {interview.durationMinutes} min ·{' '}
                  {interview.timezone}
                </p>
                {interview.meetingUrl ? (
                  <a
                    href={interview.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-text dark:text-brand-300 mt-1.5 inline-flex items-center gap-1 text-xs font-medium"
                  >
                    Join meeting <ExternalLinkIcon className="size-3" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-3 p-6">
          <h2 className="font-display text-base font-semibold">Submitted details</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Current company</dt>
              <dd>{application.currentCompany || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Experience</dt>
              <dd>{application.experienceYears != null ? `${application.experienceYears} yrs` : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Current CTC</dt>
              <dd>{application.currentCtc || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Expected CTC</dt>
              <dd>{application.expectedCtc || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Notice period</dt>
              <dd>{application.noticePeriod || '—'}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2 pt-1">
            {application.resume ? (
              <Button variant="outline" size="sm" asChild>
                <a href={application.resume.url} target="_blank" rel="noopener noreferrer">
                  <DownloadIcon className="size-3.5" /> Resume
                </a>
              </Button>
            ) : null}
            {application.coverLetter ? (
              <Button variant="outline" size="sm" asChild>
                <a href={application.coverLetter.url} target="_blank" rel="noopener noreferrer">
                  <DownloadIcon className="size-3.5" /> Cover letter
                </a>
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="gap-3 p-6">
          <h2 className="font-display text-base font-semibold">History</h2>
          {application.history.length === 0 ? (
            <p className="text-muted-foreground text-sm">No status changes yet.</p>
          ) : (
            <ul className="space-y-3">
              {application.history
                .slice()
                .reverse()
                .map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <StatusBadge kind="application" status={entry.toStatus} size="sm" />
                      {entry.note ? <p className="text-muted-foreground mt-1 text-xs">{entry.note}</p> : null}
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">{formatDate(entry.createdAt)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      {application.answers.length > 0 ? (
        <Card className="gap-4 p-6">
          <h2 className="font-display text-base font-semibold">Screening answers</h2>
          <dl className="space-y-3">
            {application.answers.map((answer) => (
              <div key={answer.questionId}>
                <dt className="text-sm font-medium">{answer.question}</dt>
                <dd className="text-muted-foreground text-sm">{answer.answer}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      <Button variant="ghost" asChild>
        <Link href="/portal/applications">← Back to applications</Link>
      </Button>
    </div>
  );
}
