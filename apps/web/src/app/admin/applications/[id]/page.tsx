'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, DownloadIcon, ExternalLinkIcon, PlusIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import {
  APPLICATION_PIPELINE,
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  applicationStatusUpdateSchema,
  noteSchema,
  type ApplicationNote,
  type ApplicationStatus,
  type ApplicationStatusUpdateInput,
  type Interview,
  type JobApplication,
} from '@kmg/shared';

import { InterviewFormDialog } from '@/components/admin/interview-form-dialog';
import { RatingStars } from '@/components/admin/rating-stars';
import {
  DetailSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBadge,
} from '@/components/shared';
import {
  Form,
  SelectField,
  SubmitButton,
  SwitchField,
  TextareaField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { Can, RequireAuth } from '@/lib/auth/guards';
import { formatDate, formatRelativeTime, initials } from '@/lib/utils';
import { resolveFileUrl } from '@/lib/resolve-file-url';

function useApplication(id: string) {
  return useQuery({
    queryKey: qk.admin.applications.detail(id),
    queryFn: () => api.getData<JobApplication>(`/admin/applications/${id}`),
    enabled: Boolean(id),
  });
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  );
}

function ResumeCard({ applicationId, hasResume }: { applicationId: string; hasResume: boolean }) {
  const [pending, setPending] = React.useState<'view' | 'download' | null>(null);

  const open = async (mode: 'view' | 'download') => {
    setPending(mode);
    try {
      const url = await resolveFileUrl(
        `/admin/applications/${applicationId}/resume${mode === 'download' ? '?download=1' : ''}`,
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not open the resume.'));
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Resume</CardTitle>
      </CardHeader>
      <CardContent>
        {hasResume ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => open('view')}>
              <ExternalLinkIcon className="size-4" />
              View
            </Button>
            <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => open('download')}>
              <DownloadIcon className="size-4" />
              Download
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No resume on file.</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusUpdateCard({ application }: { application: JobApplication }) {
  const queryClient = useQueryClient();
  const form = useZodForm(applicationStatusUpdateSchema, {
    defaultValues: { status: application.status, note: '', notifyCandidate: true },
  });

  const mutation = useMutation({
    mutationFn: (values: ApplicationStatusUpdateInput) =>
      api.patchData<JobApplication>(`/admin/applications/${application.id}/status`, values),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: qk.admin.applications.detail(application.id) });
      form.setValue('note', '');
    },
    onError: (error) => toast.error(applyApiErrorToForm(error, form)),
  });

  const activeIndex = APPLICATION_PIPELINE.indexOf(application.status);
  const isTerminal = application.status === 'REJECTED' || application.status === 'WITHDRAWN';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isTerminal ? (
          <ol className="flex flex-wrap gap-1.5">
            {APPLICATION_PIPELINE.map((stage, index) => (
              <li key={stage}>
                <Badge
                  variant={index <= activeIndex ? 'default' : 'outline'}
                  className={index <= activeIndex ? 'bg-brand-500 text-white' : 'text-muted-foreground'}
                >
                  {index < activeIndex ? <CheckIcon className="size-3" /> : null}
                  {APPLICATION_STATUS_LABELS[stage]}
                </Badge>
              </li>
            ))}
          </ol>
        ) : (
          <StatusBadge kind="application" status={application.status} />
        )}

        <Can permission="applications:write" fallback={<StatusBadge kind="application" status={application.status} />}>
          <Form {...form}>
            <form className="space-y-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <SelectField
                name="status"
                label="New status"
                options={APPLICATION_STATUSES.map((status) => ({ label: APPLICATION_STATUS_LABELS[status], value: status }))}
              />
              <TextareaField name="note" label="Note (optional)" rows={2} placeholder="Context for this change" />
              <SwitchField name="notifyCandidate" label="Notify candidate" />
              <SubmitButton size="sm" disabled={mutation.isPending}>
                Update status
              </SubmitButton>
            </form>
          </Form>
        </Can>
      </CardContent>
    </Card>
  );
}

function RatingCard({ application }: { application: JobApplication }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (rating: number) => api.patchData(`/admin/applications/${application.id}/rating`, { rating }),
    onSuccess: () => {
      toast.success('Rating saved');
      queryClient.invalidateQueries({ queryKey: qk.admin.applications.detail(application.id) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Rating</CardTitle>
      </CardHeader>
      <CardContent>
        <Can permission="applications:write" fallback={<RatingStars value={application.rating ?? 0} />}>
          <RatingStars value={application.rating ?? 0} onChange={(value) => mutation.mutate(value)} disabled={mutation.isPending} />
        </Can>
      </CardContent>
    </Card>
  );
}

function NotesCard({ application }: { application: JobApplication }) {
  const queryClient = useQueryClient();
  const form = useZodForm(noteSchema, { defaultValues: { content: '' } });

  const mutation = useMutation({
    mutationFn: (content: string) => api.postData<ApplicationNote>(`/admin/applications/${application.id}/notes`, { content }),
    onSuccess: () => {
      toast.success('Note added');
      form.reset({ content: '' });
      queryClient.invalidateQueries({ queryKey: qk.admin.applications.detail(application.id) });
    },
    onError: (error) => toast.error(applyApiErrorToForm(error, form)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Internal notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {application.notes && application.notes.length > 0 ? (
          <ul className="space-y-3">
            {application.notes.map((note) => (
              <li key={note.id} className="bg-muted/40 rounded-lg border p-3 text-sm">
                <p className="text-pretty">{note.content}</p>
                <p className="text-muted-foreground mt-1.5 text-xs">
                  {note.author.name} · {formatRelativeTime(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No notes yet.</p>
        )}
        <Can permission="applications:write">
          <Form {...form}>
            <form className="flex items-start gap-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values.content))}>
              <TextareaField name="content" placeholder="Add an internal note…" rows={2} className="flex-1" />
              <SubmitButton size="sm" disabled={mutation.isPending}>
                Add
              </SubmitButton>
            </form>
          </Form>
        </Can>
      </CardContent>
    </Card>
  );
}

function HistoryCard({ application }: { application: JobApplication }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Status history</CardTitle>
      </CardHeader>
      <CardContent>
        {application.history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No history yet.</p>
        ) : (
          <ol className="space-y-4">
            {application.history.map((entry) => (
              <li key={entry.id} className="flex gap-3 text-sm">
                <div className="mt-1 size-2 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <p>
                    {entry.fromStatus ? (
                      <>
                        <span className="text-muted-foreground">{APPLICATION_STATUS_LABELS[entry.fromStatus as ApplicationStatus]}</span> →{' '}
                      </>
                    ) : null}
                    <span className="font-medium">{APPLICATION_STATUS_LABELS[entry.toStatus]}</span>
                  </p>
                  {entry.note ? <p className="text-muted-foreground">{entry.note}</p> : null}
                  <p className="text-muted-foreground text-xs">
                    {entry.changedBy?.name ?? 'System'} · {formatDate(entry.createdAt, 'datetime')}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function InterviewsCard({ application }: { application: JobApplication }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const interviews: Interview[] = application.interviews ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Interviews</CardTitle>
        <Can permission="interviews:write">
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <PlusIcon className="size-4" />
            Schedule interview
          </Button>
        </Can>
      </CardHeader>
      <CardContent>
        {interviews.length === 0 ? (
          <EmptyState variant="plain" title="No interviews scheduled" />
        ) : (
          <ul className="divide-border divide-y">
            {interviews.map((interview) => (
              <li key={interview.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">{interview.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(interview.scheduledAt, 'datetime')} · {interview.interviewers.map((person) => person.name).join(', ')}
                  </p>
                </div>
                <StatusBadge kind="interview" status={interview.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <InterviewFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        applicationId={application.id}
        defaultTitle={`${application.job.title} — Interview`}
      />
    </Card>
  );
}

function ApplicationDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { data: application, isLoading, error, refetch } = useApplication(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading application…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !application) {
    return (
      <ErrorState
        error={error}
        title="Application not found"
        actionLabel="Back to applications"
        onAction={() => router.push('/admin/applications')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={application.candidate.name}
        description={`Applied for ${application.job.title}`}
        breadcrumbs={[{ label: 'Applications', href: '/admin/applications' }, { label: application.candidate.name }]}
        actions={<StatusBadge kind="application" status={application.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Avatar size="lg">
                <AvatarFallback>{initials(application.candidate.name)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{application.candidate.name}</CardTitle>
                <p className="text-muted-foreground text-sm">{application.candidate.email}</p>
              </div>
            </CardHeader>
            <CardContent>
              <InfoRow label="Phone" value={application.candidate.phone} />
              <InfoRow label="Location" value={application.candidate.location} />
              <Separator className="my-2" />
              <InfoRow label="Current company" value={application.currentCompany} />
              <InfoRow label="Experience" value={application.experienceYears ? `${application.experienceYears} yrs` : undefined} />
              <InfoRow label="Current CTC" value={application.currentCtc} />
              <InfoRow label="Expected CTC" value={application.expectedCtc} />
              <InfoRow label="Notice period" value={application.noticePeriod} />
              <InfoRow
                label="Links"
                value={
                  <span className="flex gap-2">
                    {application.linkedinUrl ? (
                      <a href={application.linkedinUrl} target="_blank" rel="noreferrer" className="text-primary-text hover:underline">
                        LinkedIn
                      </a>
                    ) : null}
                    {application.githubUrl ? (
                      <a href={application.githubUrl} target="_blank" rel="noreferrer" className="text-primary-text hover:underline">
                        GitHub
                      </a>
                    ) : null}
                    {application.portfolioUrl ? (
                      <a href={application.portfolioUrl} target="_blank" rel="noreferrer" className="text-primary-text hover:underline">
                        Portfolio
                      </a>
                    ) : null}
                  </span>
                }
              />
            </CardContent>
          </Card>

          {application.answers.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Screening answers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.answers.map((answer) => (
                  <div key={answer.questionId}>
                    <p className="text-sm font-medium">{answer.question}</p>
                    <p className="text-muted-foreground text-sm">{answer.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <InterviewsCard application={application} />
          <NotesCard application={application} />
          <HistoryCard application={application} />
        </div>

        <div className="space-y-6">
          <StatusUpdateCard application={application} />
          <RatingCard application={application} />
          <ResumeCard applicationId={application.id} hasResume={Boolean(application.resume)} />
        </div>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth permission="applications:read">
      <ApplicationDetailContent id={params.id} />
    </RequireAuth>
  );
}
