'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  SESSION_HINT_COOKIE_NAME,
  STAFF_ROLES,
  type AuthResponse,
  type AuthUser,
  type LoginInput,
  type Permission,
  type RegisterInput,
  type RoleName,
} from '@kmg/shared';

import { api, refreshAccessToken } from '@/lib/api/client';
import { AUTH_LOGOUT_EVENT, tokenStore } from '@/lib/auth/token-store';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isStaff: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: (options?: { redirectTo?: string }) => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  hasPermission: (permission: Permission | Permission[]) => boolean;
  hasRole: (role: RoleName | RoleName[]) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function hasSessionHint() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((entry) => entry.startsWith(`${SESSION_HINT_COOKIE_NAME}=`));
}

function unwrap(payload: AuthResponse | { data: AuthResponse }): AuthResponse {
  return 'data' in payload ? payload.data : payload;
}

/**
 * Holds the session for the whole app. Mount it once in the root layout.
 *
 * - The access token lives in memory (`tokenStore`); the refresh token is an httpOnly cookie.
 * - On mount we call `POST /auth/refresh` only when the non-httpOnly `kmg_session` hint
 *   cookie is present, so anonymous visitors never pay for a network round-trip.
 * - A silent refresh is re-run when the tab regains focus and the token is close to expiry.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const router = useRouter();
  const queryClient = useQueryClient();

  const applyAuth = React.useCallback((auth: AuthResponse) => {
    tokenStore.set(auth.accessToken, auth.expiresIn, auth.user);
    setUser(auth.user);
    setStatus('authenticated');
    return auth.user;
  }, []);

  const clearSession = React.useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
  }, [queryClient]);

  const refresh = React.useCallback(async () => {
    const auth = await refreshAccessToken();
    if (!auth) {
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
    setUser(auth.user);
    setStatus('authenticated');
    return auth.user;
  }, []);

  // Restore the session on first mount.
  React.useEffect(() => {
    let cancelled = false;
    if (!hasSessionHint()) {
      setStatus('unauthenticated');
      return;
    }
    void refreshAccessToken().then((auth) => {
      if (cancelled) return;
      if (auth) {
        setUser(auth.user);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the token warm when the user comes back to the tab.
  React.useEffect(() => {
    const onFocus = () => {
      if (hasSessionHint() && !tokenStore.isValid()) void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // The api client fires this when a refresh definitively fails.
  React.useEffect(() => {
    const onLogout = () => {
      setUser(null);
      setStatus('unauthenticated');
      queryClient.clear();
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  }, [queryClient]);

  const login = React.useCallback(
    async (input: LoginInput) => {
      const payload = await api.post<AuthResponse | { data: AuthResponse }>('/auth/login', input, {
        skipAuthRefresh: true,
      });
      return applyAuth(unwrap(payload));
    },
    [applyAuth],
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const payload = await api.post<AuthResponse | { data: AuthResponse }>('/auth/register', input, {
        skipAuthRefresh: true,
      });
      return applyAuth(unwrap(payload));
    },
    [applyAuth],
  );

  const logout = React.useCallback(
    async (options?: { redirectTo?: string }) => {
      try {
        await api.post('/auth/logout', undefined, { skipAuthRefresh: true });
      } catch {
        // Ignore — we clear local state regardless.
      }
      clearSession();
      router.push(options?.redirectTo ?? '/login');
      router.refresh();
    },
    [clearSession, router],
  );

  const hasPermission = React.useCallback(
    (permission: Permission | Permission[]) => {
      if (!user) return false;
      const required = Array.isArray(permission) ? permission : [permission];
      return required.every((item) => user.permissions.includes(item));
    },
    [user],
  );

  const hasRole = React.useCallback(
    (role: RoleName | RoleName[]) => {
      if (!user) return false;
      const required = Array.isArray(role) ? role : [role];
      return required.some((item) => user.roles.includes(item));
    },
    [user],
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && Boolean(user),
      isStaff: Boolean(user?.roles.some((role) => STAFF_ROLES.includes(role))),
      login,
      register,
      logout,
      refresh,
      hasPermission,
      hasRole,
    }),
    [user, status, login, register, logout, refresh, hasPermission, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the current session. Must be used under `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth() must be used inside <AuthProvider>');
  return context;
}
