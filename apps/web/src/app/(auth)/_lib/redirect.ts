import { STAFF_ROLES, type AuthUser } from '@kmg/shared';

/** Role-based landing page once a session exists. */
export function defaultPathForUser(user: Pick<AuthUser, 'roles'>): string {
  return user.roles.some((role) => STAFF_ROLES.includes(role)) ? '/admin' : '/portal';
}

/**
 * Resolve the post-auth redirect target: the `next` query param when it's a safe,
 * same-site path, otherwise the role-based default.
 */
export function resolveNextPath(user: Pick<AuthUser, 'roles'>, next?: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return defaultPathForUser(user);
}
