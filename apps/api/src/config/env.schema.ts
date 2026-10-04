import { z } from 'zod';

const bool = (def: boolean) =>
  z
    .preprocess((v) => {
      if (v === undefined || v === '') return def;
      if (typeof v === 'boolean') return v;
      return String(v).toLowerCase() === 'true' || String(v) === '1';
    }, z.boolean())
    .default(def);

const optional = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().optional(),
);

/**
 * Every environment variable the API understands. Validation happens once at
 * bootstrap — a missing or malformed variable fails the process immediately
 * instead of surfacing as a runtime error hours later.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  WEB_URL: z.url().default('http://localhost:3000'),
  API_PUBLIC_URL: optional,
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: bool(false),
  COOKIE_DOMAIN: optional,

  REDIS_URL: optional,

  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  GOOGLE_CALLBACK_URL: optional,
  LINKEDIN_CLIENT_ID: optional,
  LINKEDIN_CLIENT_SECRET: optional,
  LINKEDIN_CALLBACK_URL: optional,

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  S3_ENDPOINT: optional,
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: optional,
  S3_SECRET_KEY: optional,
  S3_BUCKET_PUBLIC: z.string().default('kmg-public'),
  S3_BUCKET_PRIVATE: z.string().default('kmg-private'),
  S3_FORCE_PATH_STYLE: bool(true),
  S3_PUBLIC_URL: optional,
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(300),

  MAIL_DRIVER: z.enum(['log', 'smtp']).default('log'),
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_SECURE: bool(false),
  SMTP_USER: optional,
  SMTP_PASS: optional,
  MAIL_FROM_NAME: z.string().default('KMG Technologies'),
  MAIL_FROM_ADDRESS: z.string().default('recruiting@kmgtek.com'),
  MAIL_NOTIFY_ADDRESSES: z.string().default('recruiting@kmgtek.com'),

  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(120),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  SEED_ADMIN_EMAIL: z.string().default('admin@kmgtek.com'),
  SEED_ADMIN_PASSWORD: z.string().default('ChangeMe123!'),
  SEED_DEMO_DATA: bool(false),
});

export type Env = z.infer<typeof envSchema>;
