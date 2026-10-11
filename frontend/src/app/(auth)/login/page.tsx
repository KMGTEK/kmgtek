'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { loginSchema, type LoginInput } from '@kmg/shared';

import { resolveNextPath } from '@/app/(auth)/_lib/redirect';
import {
  applyApiErrorToForm,
  Form,
  SubmitButton,
  TextField,
  useZodForm,
} from '@/components/forms';
import { FormSkeleton } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { API_BASE_PATH } from '@/lib/env';
import { useAuth } from '@/lib/auth/auth-provider';

interface AuthProviders {
  google: boolean;
  linkedin: boolean;
}

function SocialLoginButtons({ next }: { next: string }) {
  const { data: providers } = useQuery({
    queryKey: qk.auth.providers,
    queryFn: () => api.getData<AuthProviders>('/auth/providers'),
    retry: false,
    staleTime: 5 * 60_000,
  });

  if (!providers || (!providers.google && !providers.linkedin)) return null;

  return (
    <>
      <div className="relative my-2">
        <Separator />
        <span className="bg-background text-muted-foreground absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 px-3 text-xs">
          or continue with
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {providers.google ? (
          <Button variant="outline" asChild>
            <a href={`${API_BASE_PATH}/auth/google?next=${encodeURIComponent(next)}`}>Google</a>
          </Button>
        ) : null}
        {providers.linkedin ? (
          <Button variant="outline" asChild>
            <a href={`${API_BASE_PATH}/auth/linkedin?next=${encodeURIComponent(next)}`}>LinkedIn</a>
          </Button>
        ) : null}
      </div>
    </>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const { login, isAuthenticated, user, status } = useAuth();

  const form = useZodForm(loginSchema, { defaultValues: { email: '', password: '' } });

  React.useEffect(() => {
    if (status === 'authenticated' && isAuthenticated && user) {
      router.replace(resolveNextPath(user, next));
    }
  }, [status, isAuthenticated, user, next, router]);

  async function onSubmit(values: LoginInput) {
    try {
      const loggedInUser = await login(values);
      toast.success(`Welcome back, ${loggedInUser.name.split(' ')[0]}`);
      router.push(resolveNextPath(loggedInUser, next));
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  return (
    <>
      <div className="mb-8 space-y-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">Welcome back — enter your details to continue.</p>
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
          <div className="space-y-1.5">
            <TextField
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
            />
            <div className="text-right">
              <Link href="/forgot-password" className="text-primary-text dark:text-brand-300 text-sm">
                Forgot password?
              </Link>
            </div>
          </div>
          <SubmitButton className="w-full" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      </Form>

      <React.Suspense fallback={null}>
        <SocialLoginButtons next={next || '/portal'} />
      </React.Suspense>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary-text dark:text-brand-300 font-medium">
          Create one
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<FormSkeleton fields={2} />}>
      <LoginForm />
    </React.Suspense>
  );
}
