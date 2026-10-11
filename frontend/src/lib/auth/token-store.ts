import type { AuthUser } from '@kmg/shared';

/**
 * In-memory access-token store (never localStorage — see docs/API_CONTRACT.md).
 * The refresh token lives in the httpOnly `kmg_rt` cookie, so a page reload
 * recovers the session through `POST /auth/refresh`.
 */
let accessToken: string | null = null;
let expiresAt = 0;
let currentUser: AuthUser | null = null;

type Listener = (user: AuthUser | null) => void;
const listeners = new Set<Listener>();

export const tokenStore = {
  get: () => accessToken,
  getUser: () => currentUser,
  /** True when a token exists and is not within 15s of expiry. */
  isValid: () => Boolean(accessToken) && Date.now() < expiresAt - 15_000,
  set(token: string, expiresInSeconds: number, user?: AuthUser | null) {
    accessToken = token;
    expiresAt = Date.now() + expiresInSeconds * 1000;
    if (user !== undefined) currentUser = user;
    listeners.forEach((listener) => listener(currentUser));
  },
  setUser(user: AuthUser | null) {
    currentUser = user;
    listeners.forEach((listener) => listener(currentUser));
  },
  clear() {
    accessToken = null;
    expiresAt = 0;
    currentUser = null;
    listeners.forEach((listener) => listener(null));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Broadcast that the session ended (fired when a refresh fails). */
export const AUTH_LOGOUT_EVENT = 'kmg:auth-logout';

export function emitAuthLogout() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
  }
}
