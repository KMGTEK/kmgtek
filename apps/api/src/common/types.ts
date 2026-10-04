import type { Permission, RoleName } from '@kmg/shared';

/** The authenticated principal attached to `request.user` by `JwtAuthGuard`. */
export interface RequestUser {
  id: string;
  email: string;
  roles: RoleName[];
  permissions: Permission[];
  /** Candidate profile id, present for users with the CANDIDATE role. */
  candidateId?: string | null;
}

/** Payload of the HS256 access token (see docs/API_CONTRACT.md → Authentication). */
export interface JwtPayload {
  sub: string;
  email: string;
  roles: RoleName[];
  perms: Permission[];
  cid?: string | null;
  iat?: number;
  exp?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RequestUser;
      requestId?: string;
    }
  }
}
