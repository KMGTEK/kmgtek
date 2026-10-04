'use client';

import { MailCheckIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { forgotPasswordSchema, type ForgotPasswordInput } from '@kmg/shared';

import { Form, SubmitButton, TextField, useZodForm } from '@/components/forms';
import { SuccessState } from '@/components/shared/success-state';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

/**
 * Per the API contract, `/auth/forgot-password` always returns 204 — we never reveal
 * whether the email exists, so the UI always lands on the same success state.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState<string | null>(null);

  const form = useZodForm(forgotPasswordSchema, { defaultValues: { email: '' } });

  async function onSubmit(values: ForgotPasswordInput) {
    try {
      await api.post('/auth/forgot-password', values);
    } catch {
      // Ignore — the endpoint always behaves the same from the UI's point of view.
    } finally {
      setSent(values.email);
    }
  }

  if (sent) {
    return (
      <SuccessState
        title="Check your inbox"
        description={`If an account exists for ${sent}, we've sent a link to reset your password. It expires shortly, so use it soon.`}
        action={
          <Button asChild variant="outline">
            <Link href="/login">Back to sign in</Link>
          </Button>
        }
      >
        <div className="bg-muted grid size-12 place-items-center rounded-full">
          <MailCheckIcon className="text-muted-foreground size-5" aria-hidden />
        </div>
      </SuccessState>
    );
  }

  return (
    <>
      <div className="mb-8 space-y-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-muted-foreground text-sm">
          Enter the email on your account and we&apos;ll send you a reset link.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <TextField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <SubmitButton className="w-full" pendingLabel="Sending…">
            Send reset link
          </SubmitButton>
        </form>
      </Form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Remembered it?{' '}
        <Link href="/login" className="text-primary-text dark:text-brand-300 font-medium">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
