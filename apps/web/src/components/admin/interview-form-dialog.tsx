'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';

import {
  INTERVIEW_ROUNDS,
  INTERVIEW_STATUSES,
  interviewUpsertSchema,
  type Interview,
  type InterviewUpsertInput,
} from '@kmg/shared';

import { useAssignableUsers } from '@/components/admin/assignable-users';
import { MultiSelect } from '@/components/admin/multi-select';
import {
  Form,
  SelectField,
  SubmitButton,
  SwitchField,
  TextField,
  TextareaField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';

const ROUND_LABELS: Record<string, string> = {
  SCREENING: 'Screening',
  TECHNICAL: 'Technical',
  MANAGERIAL: 'Managerial',
  HR: 'HR',
  CLIENT: 'Client',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
  RESCHEDULED: 'Rescheduled',
};

function toDateTimeInputValue(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function InterviewersField() {
  const form = useFormContext<InterviewUpsertInput>();
  const { data: interviewers, isLoading } = useAssignableUsers('interviews:feedback');
  const options = (interviewers ?? []).map((user) => ({ label: user.name, value: user.id, sublabel: user.email }));

  return (
    <FormField
      control={form.control}
      name="interviewerIds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Interviewers<span className="text-destructive">*</span>
          </FormLabel>
          <FormControl>
            <MultiSelect
              options={options}
              value={(field.value as string[] | undefined) ?? []}
              onChange={field.onChange}
              loading={isLoading}
              placeholder="Select interviewers"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ApplicationField() {
  const { data, isLoading } = useQuery({
    queryKey: qk.admin.applications.list({ pageSize: 100, sort: 'createdAt:desc' }),
    queryFn: () =>
      api.getList<{ id: string; candidate: { name: string }; job: { title: string } }>('/admin/applications', {
        query: { pageSize: 100, sort: 'createdAt:desc' },
      }),
  });
  const options = (data?.data ?? []).map((application) => ({
    label: `${application.candidate.name} — ${application.job.title}`,
    value: application.id,
  }));

  return (
    <SelectField
      name="applicationId"
      label="Application"
      required
      options={options}
      placeholder={isLoading ? 'Loading…' : 'Select a candidate application'}
    />
  );
}

function MeetingLinkField() {
  const form = useFormContext<InterviewUpsertInput>();
  const generateMeetingLink = form.watch('generateMeetingLink');
  return (
    <>
      <SwitchField name="generateMeetingLink" label="Auto-generate meeting link" description="Creates a Jitsi link automatically when none is provided." />
      {!generateMeetingLink ? (
        <TextField name="meetingUrl" label="Meeting URL" placeholder="https://meet.example.com/…" />
      ) : null}
    </>
  );
}

export interface InterviewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixed application context (scheduling from an application's detail page). Omit to let the user pick one. */
  applicationId?: string;
  interview?: Interview;
  defaultTitle?: string;
  onSaved?: (interview: Interview) => void;
}

/** Create/edit dialog for `interviewUpsertSchema`, shared by the applications and interviews pages. */
export function InterviewFormDialog({
  open,
  onOpenChange,
  applicationId,
  interview,
  defaultTitle,
  onSaved,
}: InterviewFormDialogProps) {
  const queryClient = useQueryClient();
  const form = useZodForm(interviewUpsertSchema, {
    defaultValues: {
      applicationId: applicationId ?? interview?.applicationId ?? '',
      title: interview?.title ?? defaultTitle ?? '',
      round: interview?.round ?? 'SCREENING',
      status: interview?.status ?? 'SCHEDULED',
      scheduledAt: toDateTimeInputValue(interview?.scheduledAt) as unknown as Date,
      durationMinutes: interview?.durationMinutes ?? 60,
      timezone: interview?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      interviewerIds: interview?.interviewers.map((person) => person.id) ?? [],
      meetingUrl: interview?.meetingUrl ?? '',
      generateMeetingLink: !interview?.meetingUrl,
      location: interview?.location ?? '',
      notes: interview?.notes ?? '',
      notifyCandidate: true,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      applicationId: applicationId ?? interview?.applicationId ?? '',
      title: interview?.title ?? defaultTitle ?? '',
      round: interview?.round ?? 'SCREENING',
      status: interview?.status ?? 'SCHEDULED',
      scheduledAt: toDateTimeInputValue(interview?.scheduledAt) as unknown as Date,
      durationMinutes: interview?.durationMinutes ?? 60,
      timezone: interview?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      interviewerIds: interview?.interviewers.map((person) => person.id) ?? [],
      meetingUrl: interview?.meetingUrl ?? '',
      generateMeetingLink: !interview?.meetingUrl,
      location: interview?.location ?? '',
      notes: interview?.notes ?? '',
      notifyCandidate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, interview?.id]);

  const mutation = useMutation({
    mutationFn: (values: InterviewUpsertInput) =>
      interview
        ? api.patchData<Interview>(`/admin/interviews/${interview.id}`, values)
        : api.postData<Interview>('/admin/interviews', values),
    onSuccess: (saved, variables) => {
      toast.success(interview ? 'Interview updated' : 'Interview scheduled');
      queryClient.invalidateQueries({ queryKey: qk.admin.interviews.all });
      queryClient.invalidateQueries({ queryKey: qk.admin.applications.detail(variables.applicationId) });
      onOpenChange(false);
      onSaved?.(saved);
    },
    onError: (error) => toast.error(applyApiErrorToForm(error, form)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{interview ? 'Edit interview' : 'Schedule interview'}</DialogTitle>
          <DialogDescription>
            {interview ? 'Update the details for this interview.' : 'Interviewers and the candidate are notified by email.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            {!applicationId ? <ApplicationField /> : null}
            <TextField name="title" label="Title" required placeholder="Technical round 1" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                name="round"
                label="Round"
                required
                options={INTERVIEW_ROUNDS.map((round) => ({ label: ROUND_LABELS[round], value: round }))}
              />
              <SelectField
                name="status"
                label="Status"
                required
                options={INTERVIEW_STATUSES.map((status) => ({ label: STATUS_LABELS[status], value: status }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="scheduledAt" label="Date &amp; time" type="datetime-local" required />
              <TextField name="durationMinutes" label="Duration (minutes)" type="number" required />
            </div>
            <TextField name="timezone" label="Timezone" required />
            <InterviewersField />
            <MeetingLinkField />
            <TextField name="location" label="Location" placeholder="Office / room, if in person" />
            <TextareaField name="notes" label="Notes" rows={3} />
            <SwitchField name="notifyCandidate" label="Notify candidate" description="Sends an email with the interview details." />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <SubmitButton disabled={mutation.isPending}>{interview ? 'Save changes' : 'Schedule interview'}</SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
