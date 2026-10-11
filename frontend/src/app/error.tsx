'use client';

import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api/client';

/**
 * Route-level error boundary. Next.js renders this in place of the segment that
 * threw — the root layout (header/providers/etc.) around it is unaffected.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error('[web] unhandled error', error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-lg text-center">
        <Logo variant="mark" className="mx-auto size-14" />
        <div className="bg-destructive/10 text-destructive ring-destructive/25 mx-auto mt-6 grid size-14 place-items-center rounded-full ring-1">
          <AlertTriangleIcon className="size-6" aria-hidden />
        </div>
        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-pretty">
          {errorMessage(error, 'An unexpected error occurred while rendering this page.')}
        </p>
        {error.digest ? <p className="text-muted-foreground/70 mt-2 text-xs">Reference: {error.digest}</p> : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={() => reset()}>
            <RefreshCwIcon className="size-4" />
            Try again
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
