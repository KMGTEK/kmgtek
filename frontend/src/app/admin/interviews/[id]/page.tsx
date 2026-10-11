'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, VideoIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import {
  INTERVIEW_DECISIONS,
  interviewFeedbackSchema,
  type Interview,
  type InterviewFeedbackInput,
} from '@kmg/shared';

import { InterviewFormDialog } from '@/components/admin/interview-form-dialog';
import { RatingStars } from '@/components/admin/rating-stars';
import { DetailSkeleton, EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/shared';
import {
  Form,
  SelectField,
  SubmitButton,
  TextareaField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { Can, RequireAuth } from '@/lib/auth/guards';
import { useAuth } from '@/lib/auth/auth-provider';
import { formatDate } from '@/lib/utils';

const ROUND_LABELS: Record<string, string> = {
  SCREENING: 'Screening',
  TECHNICAL: 'Technical',
  MANAGERIAL: 'Managerial',
  HR: 'HR',
  CLIENT: 'Client',
};

const DECISION_LABELS: Record<string, string> = {
  STRONG_HIRE: 'Strong hire',
  HIRE: 'Hire',
  ON_HOLD: 'On hold',
  NO_HIRE: 'No hire',
  STRONG_NO_HIRE: 'Strong no hire',
};

function useInterview(id: string) {
  return useQuery({
    queryKey: qk.admin.interviews.detail(id),
    queryFn: () => api.getData<Interview>(`/admin/interviews/${id}`),
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

function FeedbackForm({ interview }: { interview: Interview }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const existing = interview.feedback.find((entry) => entry.interviewer.id === user?.id);

  const form = useZodForm(interviewFeedbackSchema, {
    defaultValues: {
      rating: existing?.rating ?? 5,
      decision: existing?.decision ?? 'HIRE',
      strengths: existing?.strengths ?? '',
      weaknesses: existing?.weaknesses ?? '',
      comments: existing?.comments ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: InterviewFeedbackInput) => api.postData(`/admin/interviews/${interview.id}/feedback`, values),
    onSuccess: () => {
      toast.success('Feedback saved');
      queryClient.invalidateQueries({ queryKey: qk.admin.interviews.detail(interview.id) });
    },
    onError: (error) => toast.error(applyApiErrorToForm(error, form)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{existing ? 'Your feedback' : 'Leave feedback'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div className="space-y-2">
              <p className="text-sm font-medium">Rating</p>
              <RatingStars value={Number(form.watch('rating')) || 0} onChange={(value) => form.setValue('rating', value)} />
            </div>
            <SelectField
              name="decision"
              label="Decision"
              required
              options={INTERVIEW_DECISIONS.map((decision) => ({ label: DECISION_LABELS[decision], value: decision }))}
            />
            <TextareaField name="strengths" label="Strengths" rows={2} />
            <TextareaField name="weaknesses" label="Weaknesses" rows={2} />
            <TextareaField name="comments" label="Comments" required rows={3} />
            <SubmitButton disabled={mutation.isPending}>{existing ? 'Update feedback' : 'Submit feedback'}</SubmitButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function FeedbackList({ interview }: { interview: Interview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        {interview.feedback.length === 0 ? (
          <EmptyState variant="plain" title="No feedback submitted yet" />
        ) : (
          <ul className="space-y-4">
            {interview.feedback.map((entry) => (
              <li key={entry.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{entry.interviewer.name}</p>
                  <RatingStars value={entry.rating} size="sm" />
                </div>
                <p className="text-muted-foreground text-xs">{DECISION_LABELS[entry.decision]}</p>
                {entry.strengths ? <p className="mt-2 text-sm"><strong>Strengths:</strong> {entry.strengths}</p> : null}
                {entry.weaknesses ? <p className="mt-1 text-sm"><strong>Weaknesses:</strong> {entry.weaknesses}</p> : null}
                <p className="mt-1 text-sm">{entry.comments}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InterviewDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { data: interview, isLoading, error } = useInterview(id);
  const [editOpen, setEditOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading interview…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <ErrorState
        error={error}
        title="Interview not found"
        actionLabel="Back to interviews"
        onAction={() => router.push('/admin/interviews')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={interview.title}
        description={interview.candidate ? `${interview.candidate.name} · ${interview.job?.title}` : undefined}
        breadcrumbs={[{ label: 'Interviews', href: '/admin/interviews' }, { label: interview.title }]}
        actions={
          <>
            <StatusBadge kind="interview" status={interview.status} />
            <Can permission="interviews:write">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <PencilIcon className="size-4" />
                Edit
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Round" value={ROUND_LABELS[interview.round]} />
              <InfoRow label="Scheduled" value={formatDate(interview.scheduledAt, 'datetime')} />
              <InfoRow label="Duration" value={`${interview.durationMinutes} minutes`} />
              <InfoRow label="Timezone" value={interview.timezone} />
              <InfoRow label="Interviewers" value={interview.interviewers.map((person) => person.name).join(', ')} />
              <InfoRow label="Location" value={interview.location} />
              <InfoRow
                label="Meeting link"
                value={
                  interview.meetingUrl ? (
                    <a href={interview.meetingUrl} target="_blank" rel="noreferrer" className="text-primary-text inline-flex items-center gap-1 hover:underline">
                      <VideoIcon className="size-3.5" />
                      Join
                    </a>
                  ) : undefined
                }
              />
              {interview.notes ? (
                <div className="mt-2">
                  <p className="text-muted-foreground text-sm">Notes</p>
                  <p className="text-sm">{interview.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <FeedbackList interview={interview} />
        </div>

        <div className="space-y-6">
          <Can permission="interviews:feedback">
            <FeedbackForm interview={interview} />
          </Can>
        </div>
      </div>

      <InterviewFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        applicationId={interview.applicationId}
        interview={interview}
      />
    </div>
  );
}

export default function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth permission="interviews:read">
      <InterviewDetailContent id={params.id} />
    </RequireAuth>
  );
}
