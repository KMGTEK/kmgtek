'use client';

import { CheckIcon, CircleIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { registerSchema, type RegisterInput } from '@kmg/shared';

import { resolveNextPath } from '@/app/(auth)/_lib/redirect';
import {
  applyApiErrorToForm,
  Form,
  SubmitButton,
  TextField,
  useZodForm,
} from '@/components/forms';
import { FormSkeleton } from '@/components/shared/loading-skeletons';
import { useAuth } from '@/lib/auth/auth-provider';
import { cn } from '@/lib/utils';

const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v) => /\d/.test(v) },
];

function PasswordStrengthHints({ value }: { value: string }) {
  return (
    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.label}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
            )}
          >
            {met ? (
              <CheckIcon className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <CircleIcon className="size-3.5 shrink-0" aria-hidden />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const { register, isAuthenticated, user, status } = useAuth();

  const form = useZodForm(registerSchema, {
    defaultValues: { name: '', email: '', password: '' },
  });
  const password = form.watch('password') ?? '';

  React.useEffect(() => {
    if (status === 'authenticated' && isAuthenticated && user) {
      router.replace(resolveNextPath(user, next));
    }
  }, [status, isAuthenticated, user, next, router]);

  async function onSubmit(values: RegisterInput) {
    try {
      const newUser = await register(values);
      toast.success('Account created — welcome to KMG Technologies!');
      router.push(resolveNextPath(newUser, next));
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  return (
    <>
      <div className="mb-8 space-y-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Track applications, save jobs and manage your profile in one place.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <TextField name="name" label="Full name" autoComplete="name" placeholder="Ada Lovelace" required />
          <TextField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <div>
            <TextField
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
            />
            <PasswordStrengthHints value={password} />
          </div>
          <SubmitButton className="w-full" pendingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>
      </Form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-primary-text dark:text-brand-300 font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={<FormSkeleton fields={3} />}>
      <RegisterForm />
    </React.Suspense>
  );
}
