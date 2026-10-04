'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { STAFF_ROLES, type Permission, type RoleName } from '@kmg/shared';

import { useAuth } from '@/lib/auth/auth-provider';
import { FullPageLoader } from '@/components/shared/loading-skeletons';
import { ErrorState } from '@/components/shared/error-state';

/**
 * Client-side route guard. The `proxy.ts` middleware already bounces visitors with no
 * session hint cookie; this component handles the real check (token + roles + permissions)
 * and renders a loader while the session is being restored.
 */
export function RequireAuth({
  children,
  roles,
  permission,
  redirectTo = '/login',
  fallback,
}: {
  children: React.ReactNode;
  /** Any of these roles grants access. */
  roles?: RoleName[];
  /** All of these permissions are required. */
  permission?: Permission | Permission[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}) {
  const { status, user, hasPermission, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`${redirectTo}?next=${encodeURIComponent(pathname ?? '/')}`);
    }
  }, [status, router, pathname, redirectTo]);

  if (status === 'loading') return <>{fallback ?? <FullPageLoader />}</>;
  if (status === 'unauthenticated' || !user) return <>{fallback ?? <FullPageLoader />}</>;

  const roleOk = !roles || hasRole(roles);
  const permissionOk = !permission || hasPermission(permission);

  if (!roleOk || !permissionOk) {
    return (
      <ErrorState
        title="You do not have access"
        description="Your account does not have permission to view this page. Contact an administrator if you believe this is a mistake."
        actionLabel="Go back"
        onAction={() => router.back()}
      />
    );
  }

  return <>{children}</>;
}

/** Guard for `/admin/*` — requires any staff role. */
export function RequireStaff({ children, permission }: { children: React.ReactNode; permission?: Permission | Permission[] }) {
  return (
    <RequireAuth roles={STAFF_ROLES} permission={permission}>
      {children}
    </RequireAuth>
  );
}

/** Guard for `/portal/*` — requires a signed-in candidate (staff may preview too). */
export function RequireCandidate({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

/**
 * Conditional rendering by permission/role.
 *
 * ```tsx
 * <Can permission="jobs:write"><Button>New job</Button></Can>
 * ```
 */
export function Can({
  permission,
  role,
  children,
  fallback = null,
}: {
  permission?: Permission | Permission[];
  role?: RoleName | RoleName[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, hasRole } = useAuth();
  const allowed = (!permission || hasPermission(permission)) && (!role || hasRole(role));
  return <>{allowed ? children : fallback}</>;
}

/** Hook form of `<Can>` for imperative checks. */
export function useCan(permission?: Permission | Permission[], role?: RoleName | RoleName[]) {
  const { hasPermission, hasRole } = useAuth();
  return (!permission || hasPermission(permission)) && (!role || hasRole(role));
}
