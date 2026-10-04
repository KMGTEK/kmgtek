'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { emailTemplateUpdateSchema, type EmailTemplate, type EmailTemplateUpdateInput } from '@kmg/shared';

import { DetailSkeleton, ErrorState, PageHeader } from '@/components/shared';
import {
  Form,
  SubmitButton,
  TextField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth } from '@/lib/auth';

function SendTestEmailDialog({ templateId }: { templateId: string }) {
  const [open, setOpen] = React.useState(false);
  const [to, setTo] = React.useState('');
  const [sending, setSending] = React.useState(false);

  async function send() {
    try {
      setSending(true);
      await api.post(`/admin/email-templates/${templateId}/test`, { to });
      toast.success(`Test email sent to ${to}`);
      setOpen(false);
      setTo('');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Send test email</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a test email</DialogTitle>
          <DialogDescription>Sends this template with sample data to the address below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="test-email-to">Recipient</Label>
          <Input id="test-email-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@kmgtek.com" />
        </div>
        <Button onClick={send} disabled={!to || sending} className="w-full">
          {sending ? 'Sending…' : 'Send test email'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function EditEmailTemplatePage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.emailTemplate(params.id),
    queryFn: () => api.getData<EmailTemplate>(`/admin/email-templates/${params.id}`),
  });

  const form = useZodForm(emailTemplateUpdateSchema, {
    values: data ? { subject: data.subject, html: data.html } : undefined,
    defaultValues: { subject: '', html: '' },
  });

  async function onSubmit(values: EmailTemplateUpdateInput) {
    try {
      await api.put(`/admin/email-templates/${params.id}`, values);
      toast.success('Template updated');
      queryClient.invalidateQueries({ queryKey: qk.admin.emailTemplate(params.id) });
      queryClient.invalidateQueries({ queryKey: qk.admin.emailTemplates });
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  return (
    <RequireAuth permission="settings:write">
      <div className="space-y-6">
        <PageHeader
          title={data?.name ?? 'Email template'}
          breadcrumbs={[{ label: 'Email Templates', href: '/admin/email-templates' }, { label: data?.name ?? 'Edit' }]}
          actions={data ? <SendTestEmailDialog templateId={data.id} /> : null}
        />
        {isLoading ? (
          <DetailSkeleton />
        ) : error || !data ? (
          <ErrorState error={error} onAction={() => refetch()} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <Card>
                    <CardHeader>
                      <CardTitle>Template</CardTitle>
                      <CardDescription>
                        Key: <code className="font-mono">{data.key}</code>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <TextField name="subject" label="Subject" required />
                      <div className="space-y-2">
                        <Label htmlFor="html-body">HTML body</Label>
                        <Textarea
                          id="html-body"
                          rows={20}
                          className="font-mono text-xs"
                          value={form.watch('html') ?? ''}
                          onChange={(e) => form.setValue('html', e.target.value, { shouldValidate: true, shouldDirty: true })}
                        />
                        {form.formState.errors.html ? (
                          <p className="text-destructive text-sm">{String(form.formState.errors.html.message)}</p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                  <SubmitButton pendingLabel="Saving…">Save template</SubmitButton>
                </form>
              </Form>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Variables</CardTitle>
                  <CardDescription>Available Handlebars placeholders for this template.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {data.variables.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No variables.</p>
                  ) : (
                    data.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="font-mono">
                        {`{{${variable}}}`}
                      </Badge>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
