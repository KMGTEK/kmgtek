'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { LEAD_STATUSES, leadUpdateSchema, noteSchema, type ContactLead, type LeadUpdateInput } from '@kmg/shared';

import { useAssignableUsers } from '@/components/admin/assignable-users';
import { DetailSkeleton, ErrorState, PageHeader, StatusBadge } from '@/components/shared';
import {
  Form,
  SelectField,
  SubmitButton,
  TextareaField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { Can, RequireAuth } from '@/lib/auth/guards';
import { formatDate, formatRelativeTime } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  LOST: 'Lost',
};

function useLead(id: string) {
  return useQuery({
    queryKey: qk.admin.leads.detail(id),
    queryFn: () => api.getData<ContactLead>(`/admin/leads/${id}`),
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

function StatusAssignmentCard({ lead }: { lead: ContactLead }) {
  const queryClient = useQueryClient();
  const { data: assignable } = useAssignableUsers('leads:write');
  const form = useZodForm(leadUpdateSchema, {
    defaultValues: { status: lead.status, assignedToId: lead.assignedTo?.id ?? null },
  });

  const mutation = useMutation({
    mutationFn: (values: LeadUpdateInput) => api.patchData<ContactLead>(`/admin/leads/${lead.id}`, values),
    onSuccess: () => {
      toast.success('Lead updated');
      queryClient.invalidateQueries({ queryKey: qk.admin.leads.all });
    },
    onError: (error) => toast.error(applyApiErrorToForm(error, form)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Status &amp; assignment</CardTitle>
      </CardHeader>
      <CardContent>
        <Can permission="leads:write" fallback={<StatusBadge kind="lead" status={lead.status} />}>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <SelectField
                name="status"
                label="Status"
                options={LEAD_STATUSES.map((status) => ({ label: STATUS_LABELS[status], value: status }))}
              />
              <Can permission="leads:assign">
                <SelectField
                  name="assignedToId"
                  label="Assigned to"
                  options={(assignable ?? []).map((user) => ({ label: user.name, value: user.id }))}
                  placeholder="Unassigned"
                />
              </Can>
              <SubmitButton disabled={mutation.isPending}>Save changes</SubmitButton>
            </form>
          </Form>
        </Can>
      </CardContent>
    </Card>
  );
}

function NotesCard({ lead }: { lead: ContactLead }) {
  const queryClient = useQueryClient();
  const form = useZodForm(noteSchema, { defaultValues: { content: '' } });

  const mutation = useMutation({
    mutationFn: (content: string) => api.postData(`/admin/leads/${lead.id}/notes`, { content }),
    onSuccess: () => {
      toast.success('Note added');
      form.reset({ content: '' });
      queryClient.invalidateQueries({ queryKey: qk.admin.leads.detail(lead.id) });
    },
    onError: (error) => toast.error(applyApiErrorToForm(error, form)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lead.notes && lead.notes.length > 0 ? (
          <ul className="space-y-3">
            {lead.notes.map((note) => (
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
        <Can permission="leads:write">
          <Form {...form}>
            <form className="flex items-start gap-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values.content))}>
              <TextareaField name="content" placeholder="Add a note…" rows={2} className="flex-1" />
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

function LeadDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { data: lead, isLoading, error } = useLead(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading lead…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <ErrorState error={error} title="Lead not found" actionLabel="Back to leads" onAction={() => router.push('/admin/leads')} />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.name}
        description={lead.company ?? undefined}
        breadcrumbs={[{ label: 'Leads', href: '/admin/leads' }, { label: lead.name }]}
        actions={<StatusBadge kind="lead" status={lead.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Contact details</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Email" value={<a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>} />
              <InfoRow label="Phone" value={lead.phone} />
              <InfoRow label="Company" value={lead.company} />
              <InfoRow label="Country" value={lead.country} />
              <InfoRow label="Service interest" value={lead.service?.title ?? lead.serviceInterest} />
              <InfoRow label="Source" value={lead.source} />
              <InfoRow label="Received" value={formatDate(lead.createdAt, 'datetime')} />
              <Separator className="my-3" />
              <p className="text-muted-foreground text-sm">Message</p>
              <p className="mt-1 text-sm text-pretty">{lead.message}</p>
            </CardContent>
          </Card>

          <NotesCard lead={lead} />
        </div>

        <div className="space-y-6">
          <StatusAssignmentCard lead={lead} />
        </div>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth permission="leads:read">
      <LeadDetailContent id={params.id} />
    </RequireAuth>
  );
}
