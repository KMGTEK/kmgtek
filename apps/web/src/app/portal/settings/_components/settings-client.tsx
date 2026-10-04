'use client';

import { toast } from 'sonner';

import { changePasswordSchema, type ChangePasswordInput } from '@kmg/shared';

import {
  applyApiErrorToForm,
  Form,
  SubmitButton,
  TextField,
  useZodForm,
} from '@/components/forms';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api/client';

export function SettingsClient() {
  const form = useZodForm(changePasswordSchema, {
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: ChangePasswordInput) {
    try {
      await api.post('/auth/change-password', values);
      toast.success('Password updated');
      form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your account security." />

      <Card className="max-w-lg gap-5 p-6">
        <h2 className="font-display text-base font-semibold">Change password</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <TextField
              name="currentPassword"
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
            />
            <TextField
              name="newPassword"
              label="New password"
              type="password"
              autoComplete="new-password"
              description="At least 8 characters, with an uppercase letter, a lowercase letter and a number."
              required
            />
            <TextField
              name="confirmPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
            />
            <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
          </form>
        </Form>
      </Card>
    </div>
  );
}
