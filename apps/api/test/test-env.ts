import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

loadEnv({ path: join(__dirname, '..', '.env'), quiet: true });
loadEnv({ path: join(__dirname, '..', '..', '..', '.env'), quiet: true });

/**
 * The e2e database. Defaults to the dev database name suffixed with `_test`
 * (kmg → kmg_test); override with TEST_DATABASE_URL.
 */
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;

  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is not set — copy .env.example to apps/api/.env');

  const url = new URL(raw);
  url.pathname = url.pathname.replace(/\/([^/]+)$/, (_match, database: string) =>
    database.endsWith('_test') ? `/${database}` : `/${database}_test`,
  );
  return url.toString();
}

/** Deterministic environment for tests: test DB, no real mail, no rate limiting. */
export function applyTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testDatabaseUrl();
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-that-is-at-least-32-characters-long';
  process.env.MAIL_DRIVER = 'log';
  process.env.STORAGE_DRIVER = 'local';
  process.env.COOKIE_SECURE = 'false';
  process.env.RATE_LIMIT_PER_MINUTE = '100000';
  process.env.LOG_LEVEL = 'silent';
  process.env.SEED_DEMO_DATA = 'false';
}
