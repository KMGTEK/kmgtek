/**
 * Typed environment access.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so they must be referenced
 * statically (never `process.env[key]`). Server-only values are read lazily and
 * must not be imported from a `'use client'` module.
 */

export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? '',
} as const;

export type PublicEnv = typeof publicEnv;

/** Server-only env. Throws if called from the browser bundle. */
export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() must only be used on the server');
  }
  return {
    apiInternalUrl: (process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(/\/$/, ''),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  } as const;
}

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

/** API base path used by the browser (proxied to the API by a Next rewrite). */
export const API_BASE_PATH = '/api/v1';
