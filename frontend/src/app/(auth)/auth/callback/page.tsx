'use client';

import { TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { resolveNextPath } from '@/app/(auth)/_lib/redirect';
import { FullPageLoader } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-provider';

/**
 * Landing page after a Google/LinkedIn OAuth redirect. The API has already set the
 * refresh-token cookie; this page exchanges it for an access token (`POST /auth/refresh`
 * via `useAuth().refresh()`) and forwards the visitor to `next` (or the role default).
 */
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const { refresh } = useAuth();
  const [failed, setFailed] = React.useState(false);
  const attempted = React.useRef(false);

  const attempt = React.useCallback(async () => {
    setFailed(false);
    const user = await refresh();
    if (user) {
      router.replace(resolveNextPath(user, next));
    } else {
      setFailed(true);
    }
  }, [refresh, router, next]);

  React.useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void attempt();
  }, [attempt]);

  if (failed) {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-destructive/10 text-destructive mx-auto grid size-12 place-items-center rounded-full">
          <TriangleAlertIcon className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-xl font-semibold tracking-tight">Sign-in didn&apos;t complete</h1>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t confirm your session. This can happen if the link expired — try again.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <Button
            onClick={() => {
              attempted.current = false;
              void attempt();
            }}
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <FullPageLoader label="Finishing sign-in…" />;
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense fallback={<FullPageLoader label="Finishing sign-in…" />}>
      <CallbackContent />
    </React.Suspense>
  );
}
