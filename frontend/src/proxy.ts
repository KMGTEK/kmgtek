import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SESSION_HINT_COOKIE_NAME } from '@kmg/shared';

/**
 * Edge proxy (Next 16 renamed `middleware.ts` → `proxy.ts`; see
 * https://nextjs.org/docs/messages/middleware-to-proxy).
 *
 * Cheaply gates `/portal/*` and `/admin/*` by checking for the non-httpOnly
 * `kmg_session` hint cookie (set by the API alongside the real httpOnly refresh
 * token — see `docs/API_CONTRACT.md`). It carries no secrets and proves nothing on
 * its own; it only saves an anonymous visitor a round trip before hitting the real
 * check in `<RequireAuth>` / `<RequireStaff>` / `<RequireCandidate>` (`src/lib/auth/guards.tsx`),
 * which validates the actual session (role + permissions) once the token is restored.
 */
const PROTECTED_PREFIXES = ['/portal', '/admin'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtected(pathname)) return NextResponse.next();
  if (request.cookies.has(SESSION_HINT_COOKIE_NAME)) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
};
