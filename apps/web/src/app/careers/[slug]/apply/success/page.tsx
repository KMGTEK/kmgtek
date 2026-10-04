'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as React from 'react';

import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { FullPageLoader } from '@/components/shared/loading-skeletons';
import { SuccessState } from '@/components/shared/success-state';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-provider';

function SuccessContent() {
  const searchParams = useSearchParams();
  const accountCreated = searchParams.get('created') === '1';
  const { isAuthenticated } = useAuth();

  return (
    <SuccessState
      title="Application submitted"
      description={
        isAuthenticated
          ? "We've received your application. You can track its status, upcoming interviews and any updates from your candidate portal."
          : accountCreated
            ? "We've received your application and created an account for you so you can track it. Check your email for a link to set your password."
            : "We've received your application. If you already have an account, sign in to track its status."
      }
      action={
        isAuthenticated ? (
          <Button asChild size="lg" variant="gradient">
            <Link href="/portal/applications">Track your application</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg" variant="gradient">
              <Link href="/register">{accountCreated ? 'Set up your account' : 'Create an account'}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/careers">Browse more roles</Link>
            </Button>
          </>
        )
      }
    />
  );
}

export default function ApplySuccessPage() {
  return (
    <Section spacing="lg">
      <Container size="prose">
        <React.Suspense fallback={<FullPageLoader label="Loading…" />}>
          <SuccessContent />
        </React.Suspense>
      </Container>
    </Section>
  );
}
