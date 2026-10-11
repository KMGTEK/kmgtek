import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { COMPANY } from '@kmg/shared';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfigService } from './config/config.module';

export const API_GLOBAL_PREFIX = 'api/v1';
/** Health probes stay unversioned so orchestrators can hit them directly. */
export const UNPREFIXED_ROUTES = ['health/live', 'health/ready'];

/**
 * Applies every cross-cutting concern (security headers, CORS, cookies, body
 * limits, global prefix, exception filter). Shared by `main.ts` and the e2e tests
 * so tests exercise the real middleware stack.
 */
export function configureApp(app: NestExpressApplication): AppConfigService {
  const config = app.get(AppConfigService);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Swagger UI needs inline styles/scripts; the API serves no other HTML.
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...config.corsOrigins],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
    maxAge: 600,
  });

  app.setGlobalPrefix(API_GLOBAL_PREFIX, { exclude: UNPREFIXED_ROUTES });
  app.useGlobalFilters(new AllExceptionsFilter(config.isProd));
  app.enableShutdownHooks();

  return config;
}

/** OpenAPI at `/api/docs` (UI) and `/api/docs-json` (spec). */
export function setupSwagger(app: INestApplication, config: AppConfigService): void {
  const options = new DocumentBuilder()
    .setTitle(`${COMPANY.displayName} API`)
    .setDescription(
      'REST API for the KMG Technologies website, lead generation and recruitment portal. ' +
        'Responses use the `{ data }` / `{ data, meta }` envelopes described in docs/API_CONTRACT.md.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token returned by POST /auth/login',
      },
      'bearer',
    )
    .addCookieAuth('kmg_rt', { type: 'apiKey', in: 'cookie' }, 'refreshCookie')
    .addServer(config.apiUrl)
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha', operationsSorter: 'alpha' },
    customSiteTitle: `${COMPANY.displayName} API docs`,
  });
}
