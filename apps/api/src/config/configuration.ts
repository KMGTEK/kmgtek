import { envSchema, type Env } from './env.schema';

export interface AppConfig {
  env: Env['NODE_ENV'];
  isProd: boolean;
  isTest: boolean;
  port: number;
  webUrl: string;
  /** Absolute base URL browsers use to reach this API (used to build file URLs). */
  apiUrl: string;
  corsOrigins: string[];
  logLevel: Env['LOG_LEVEL'];
  rateLimitPerMinute: number;
  jwt: {
    accessSecret: string;
    accessTtl: string;
    refreshTtlDays: number;
  };
  cookie: {
    secure: boolean;
    domain?: string;
  };
  redisUrl?: string;
  oauth: {
    google?: { clientId: string; clientSecret: string; callbackUrl: string };
    linkedin?: { clientId: string; clientSecret: string; callbackUrl: string };
  };
  storage: {
    driver: 'local' | 's3';
    localDir: string;
    signedUrlTtlSeconds: number;
    s3: {
      endpoint?: string;
      region: string;
      accessKey?: string;
      secretKey?: string;
      publicBucket: string;
      privateBucket: string;
      forcePathStyle: boolean;
      publicUrl?: string;
    };
  };
  mail: {
    driver: 'log' | 'smtp';
    fromName: string;
    fromAddress: string;
    notifyAddresses: string[];
    smtp: {
      host?: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
    };
  };
  seed: {
    adminEmail: string;
    adminPassword: string;
    demoData: boolean;
  };
}

const list = (value: string): string[] =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

/** Validate raw `process.env` and project it into the nested {@link AppConfig}. */
export function buildConfig(raw: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const e = parsed.data;

  return {
    env: e.NODE_ENV,
    isProd: e.NODE_ENV === 'production',
    isTest: e.NODE_ENV === 'test',
    port: e.API_PORT,
    webUrl: e.WEB_URL.replace(/\/$/, ''),
    apiUrl: (e.API_PUBLIC_URL ?? e.WEB_URL).replace(/\/$/, ''),
    corsOrigins: list(e.CORS_ORIGINS),
    logLevel: e.LOG_LEVEL,
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
    jwt: {
      accessSecret: e.JWT_ACCESS_SECRET,
      accessTtl: e.JWT_ACCESS_TTL,
      refreshTtlDays: e.REFRESH_TOKEN_TTL_DAYS,
    },
    cookie: { secure: e.COOKIE_SECURE, domain: e.COOKIE_DOMAIN },
    redisUrl: e.REDIS_URL,
    oauth: {
      google:
        e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
          ? {
              clientId: e.GOOGLE_CLIENT_ID,
              clientSecret: e.GOOGLE_CLIENT_SECRET,
              callbackUrl: e.GOOGLE_CALLBACK_URL ?? `${e.WEB_URL}/api/v1/auth/google/callback`,
            }
          : undefined,
      linkedin:
        e.LINKEDIN_CLIENT_ID && e.LINKEDIN_CLIENT_SECRET
          ? {
              clientId: e.LINKEDIN_CLIENT_ID,
              clientSecret: e.LINKEDIN_CLIENT_SECRET,
              callbackUrl: e.LINKEDIN_CALLBACK_URL ?? `${e.WEB_URL}/api/v1/auth/linkedin/callback`,
            }
          : undefined,
    },
    storage: {
      driver: e.STORAGE_DRIVER,
      localDir: e.STORAGE_LOCAL_DIR,
      signedUrlTtlSeconds: e.SIGNED_URL_TTL_SECONDS,
      s3: {
        endpoint: e.S3_ENDPOINT,
        region: e.S3_REGION,
        accessKey: e.S3_ACCESS_KEY,
        secretKey: e.S3_SECRET_KEY,
        publicBucket: e.S3_BUCKET_PUBLIC,
        privateBucket: e.S3_BUCKET_PRIVATE,
        forcePathStyle: e.S3_FORCE_PATH_STYLE,
        publicUrl: e.S3_PUBLIC_URL,
      },
    },
    mail: {
      driver: e.MAIL_DRIVER,
      fromName: e.MAIL_FROM_NAME,
      fromAddress: e.MAIL_FROM_ADDRESS,
      notifyAddresses: list(e.MAIL_NOTIFY_ADDRESSES),
      smtp: {
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_SECURE,
        user: e.SMTP_USER,
        pass: e.SMTP_PASS,
      },
    },
    seed: {
      adminEmail: e.SEED_ADMIN_EMAIL,
      adminPassword: e.SEED_ADMIN_PASSWORD,
      demoData: e.SEED_DEMO_DATA,
    },
  };
}
