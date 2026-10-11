'use client';

import { TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { resetPasswordSchema, type ResetPasswordInput } from '@kmg/shared';

import {
  applyApiErrorToForm,
  Form,
  SubmitButton,
  TextField,
  useZodForm,
} from '@/components/forms';
import { FormSkeleton } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const form = useZodForm(resetPasswordSchema, { defaultValues: { token, password: '' } });

  async function onSubmit(values: ResetPasswordInput) {
    try {
      await api.post('/auth/reset-password', values);
      toast.success('Password updated — sign in with your new password.');
      router.push('/login');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-destructive/10 text-destructive mx-auto grid size-12 place-items-center rounded-full">
          <TriangleAlertIcon className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-xl font-semibold tracking-tight">Invalid reset link</h1>
          <p className="text-muted-foreground text-sm">
            This link is missing its token. Request a new password reset email and try again.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 space-y-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-muted-foreground text-sm">Choose a strong password for your account.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <input type="hidden" {...form.register('token')} />
          <TextField
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            description="At least 8 characters, with an uppercase letter, a lowercase letter and a number."
            required
          />
          <SubmitButton className="w-full" pendingLabel="Updating…">
            Update password
          </SubmitButton>
        </form>
      </Form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        <Link href="/login" className="text-primary-text dark:text-brand-300 font-medium">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<FormSkeleton fields={1} />}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
