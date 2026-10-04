# @kmg/api — KMG Technologies REST API

NestJS 11 + Prisma 6 + PostgreSQL. Implements the contract in [`docs/API_CONTRACT.md`](../../docs/API_CONTRACT.md).
Shared constants, types and zod schemas come from [`@kmg/shared`](../../packages/shared).

---

## Quick start

```bash
pnpm install                                # repo root
pnpm --filter @kmg/shared build             # @kmg/api imports its dist/
cp ../../.env.example apps/api/.env         # then set DATABASE_URL
pnpm --filter @kmg/api prisma:generate
pnpm --filter @kmg/api prisma:migrate       # creates/applies migrations
pnpm --filter @kmg/api prisma:seed          # idempotent — safe to re-run
pnpm --filter @kmg/api dev                  # http://localhost:4000
```

- API base path: `http://localhost:4000/api/v1`
- Swagger UI: `http://localhost:4000/api/docs` · spec: `/api/docs-json`
- Health (unversioned): `/health/live`, `/health/ready`

### Scripts

| Script | What it does |
| --- | --- |
| `dev` | `nest start --watch` |
| `build` / `start:prod` | compile to `dist/` · run `dist/main.js` |
| `lint` / `typecheck` | `tsc --noEmit` |
| `test` / `test:watch` / `test:cov` | Jest unit tests (`test/unit`) |
| `test:e2e` | migrates + seeds the `*_test` database, then runs `test/e2e` |
| `prisma:generate` / `prisma:migrate` / `prisma:deploy` | Prisma client, `migrate dev`, `migrate deploy` |
| `prisma:seed` / `prisma:studio` | seed data · Prisma Studio |

---

## Layout

```
src/
  main.ts                     bootstrap (delegates to bootstrap.ts)
  bootstrap.ts                helmet, CORS, cookies, body limits, global prefix, filter, Swagger
  app.module.ts               module graph + global ThrottlerGuard + request-id middleware
  config/                     env.schema.ts (zod) · configuration.ts · AppConfigService
  common/
    decorators/               @Public @OptionalAuth @Roles @Permissions @CurrentUser
                              @CsrfProtected @RateLimit @Audit + Swagger helpers
    guards/                   JwtAuthGuard · PermissionsGuard · RolesGuard (global) · CsrfGuard
    filters/                  AllExceptionsFilter → ApiErrorBody
    middleware/               RequestIdMiddleware (X-Request-Id)
    pipes/                    ZodValidationPipe
    utils/                    pagination · response · slug · csv · crypto · password · sanitize
    types.ts                  RequestUser, JwtPayload, Express.Request augmentation
  infrastructure/
    prisma/                   PrismaService (global)
    logger/                   nestjs-pino (pretty in dev, JSON in prod, redacted)
    storage/                  StorageService + LocalStorageDriver | S3StorageDriver
    mail/                     MailService + log/SMTP drivers + branded layout
    cache/                    throttler storage (Redis when REDIS_URL is set)
  modules/
    health auth users rbac audit uploads notifications settings email-templates events
prisma/  schema.prisma · migrations/ · seed.ts · seed-data/
test/    unit/ · e2e/ · jest configs
```

Everything under `infrastructure/` plus `audit`, `events`, `notifications`, `settings`, `rbac`,
`auth` and `uploads` is registered as a **global module** — inject their services anywhere without
importing the module.

---

## Adding a module (conventions)

Create `src/modules/<name>/` with `<name>.module.ts`, `<name>.service.ts`, `<name>.controller.ts`,
and add the module to `AppModule.imports`. Controllers are mounted under `/api/v1` automatically.

### 1. Auth, roles and permissions

`JwtAuthGuard` is global: **every route requires a bearer token unless you opt out.**

```ts
@Public()                  // no auth at all (public website endpoints)
@OptionalAuth()            // attach request.user when a token is present, allow anonymous
@Permissions('jobs:write') // requires the permission (SUPER_ADMIN always passes)
@Roles('CANDIDATE')        // requires one of these roles
```

```ts
import { CurrentUser, Permissions, Public } from '../../common/decorators';
import type { RequestUser } from '../../common/types';

@ApiTags('Admin · Jobs')
@ApiBearerAuth()
@Controller('admin/jobs')
export class JobsController {
  @Get()
  @Permissions('jobs:read')
  list(@CurrentUser() user: RequestUser) {}
}
```

### 2. Validation — zod schemas from `@kmg/shared`

Never hand-roll DTO validation; reuse the shared schema so web and API agree.

```ts
import { jobUpsertSchema, type JobUpsertInput } from '@kmg/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/decorators/swagger.decorators';

@Post()
@Permissions('jobs:write')
@ApiZodBody(jobUpsertSchema)              // documents the body in Swagger via z.toJSONSchema()
create(@Body(new ZodValidationPipe(jobUpsertSchema)) dto: JobUpsertInput) {}

@Get()
list(@Query(new ZodValidationPipe(jobsQuerySchema)) query: JobsQuery) {}
```

Failures become `400 { message: 'Validation failed', details: [{ path, message }] }`.

### 3. Response envelopes

```ts
import { ok } from '../../common/utils/response.util';
import { paginate, parsePagination, parseSort } from '../../common/utils/pagination.util';

return ok(job);                                     // { data }

const { page, pageSize, skip, take } = parsePagination(query);
const [rows, total] = await this.prisma.$transaction([
  this.prisma.job.findMany({ where, skip, take, orderBy: parseSort(query.sort, ['createdAt', 'title']) }),
  this.prisma.job.count({ where }),
]);
return paginate(rows.map(toDto), total, { page, pageSize });   // { data, meta }
```

Deletes return `204` (`@HttpCode(HttpStatus.NO_CONTENT)`). Swagger helpers:
`ApiDataResponse(schema)`, `ApiPaginatedResponse(itemSchema)`, `ApiZodBody`, `ApiZodQuery`.

### 4. Auditing admin mutations

```ts
import { Audit } from '../../common/decorators';

@Patch(':id')
@Permissions('jobs:write')
@Audit('job.update', 'Job')     // action, entityType, optional id param name (default 'id')
update() {}
```

The global `AuditInterceptor` writes the row after a successful response (actor, ip, user-agent,
request id and a redacted body). For non-HTTP call sites inject `AuditService.log(...)`.

### 5. Events

```ts
import { AppEventsService } from '../events/app-events.service';
import { EVENTS, type ApplicationCreatedPayload } from '../events/event-names';

this.events.emit(EVENTS.APPLICATION_CREATED, { applicationId });      // typed payloads

@OnEvent(EVENTS.APPLICATION_CREATED, { async: true })
async handle(payload: ApplicationCreatedPayload) {}
```

Add new event names + payload types to `event-names.ts` so emitters stay type-safe.

### 6. Mail, notifications, settings, storage

```ts
this.mail.queueTemplate({ to, templateKey: 'interview.scheduled', variables, attachments });  // never throws
await this.notifications.notifyRoles(['HR', 'RECRUITER'], { type: 'APPLICATION_RECEIVED', title, body, link });
const { company, seo } = await this.settings.getAll();
const file = await this.uploads.store(multerFile, 'RESUME', user.id);   // validates size/MIME/magic bytes
const url = await this.storage.signedUrl(file.key, 'PRIVATE', { downloadName: 'cv.pdf' });
```

Email bodies live in the `email_templates` table (Handlebars, admin-editable) — add new keys to
`EMAIL_TEMPLATE_KEYS` in `@kmg/shared` and to `prisma/seed-data/email-templates.ts`.

### 7. Rate limiting and CSRF

Global limit is `RATE_LIMIT_PER_MINUTE` per IP. Tighten per route and protect cookie endpoints:

```ts
@RateLimit(5, 60)      // 5 requests / 60s — use on contact, apply, comments, auth
@CsrfProtected()       // requires X-Requested-With + allow-listed Origin (cookie-auth routes only)
```

### 8. Rich text and CSV

```ts
import { sanitizeRichText, stripHtml } from '../../common/utils/sanitize.util';
import { toCsv } from '../../common/utils/csv.util';

content: sanitizeRichText(dto.content),                       // always sanitize admin HTML
res.type('text/csv').send(toCsv(rows, [['Name', 'fullName'], ['Email', 'email']]));
```

### 9. Soft deletes

`User`, `Job`, `JobApplication`, `BlogPost`, `ContactLead` and `FileObject` use `deletedAt`.
Filter with `deletedAt: null` (or `PrismaService.alive(where)`) and delete via
`prisma.softDelete('job', id)`.

---

## Security

- bcryptjs cost 12; timing-equalized login (dummy hash) so emails cannot be enumerated.
- Lockout after 5 consecutive failed logins for 15 minutes.
- Refresh tokens: opaque, stored as sha256, rotated on every use; reuse revokes the whole family.
- Password reset tokens: sha256, single use, 1 hour TTL. Reset/change revokes all sessions.
- Cookies: `kmg_rt` HttpOnly/SameSite=Lax/`Path=/api/v1/auth`, `kmg_session=1` hint cookie, both
  `Secure` when `COOKIE_SECURE=true`.
- helmet CSP, CORS allow-list from `CORS_ORIGINS`, 1 MB JSON body limit, `X-Request-Id` on every response.
- Uploads validated against `UPLOAD_RULES` (size + MIME) **and** magic bytes; private files served
  through short-lived signed URLs only.
- Production errors never include stack traces or driver messages.

---

## Environment

See [`.env.example`](../../.env.example); validated at boot by `src/config/env.schema.ts` (the process
exits on an invalid value). `apps/api/.env` takes precedence over the repo-root `.env`.

Key variables: `API_PORT`, `WEB_URL`, `API_PUBLIC_URL`, `CORS_ORIGINS`, `DATABASE_URL`,
`JWT_ACCESS_SECRET` (≥32 chars), `JWT_ACCESS_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `COOKIE_SECURE`,
`COOKIE_DOMAIN`, `REDIS_URL`, `GOOGLE_*`/`LINKEDIN_*` (social login is disabled when unset),
`STORAGE_DRIVER` (`local|s3`) + `STORAGE_LOCAL_DIR` or `S3_*`, `SIGNED_URL_TTL_SECONDS`,
`MAIL_DRIVER` (`log|smtp`) + `SMTP_*`/`MAIL_*`, `RATE_LIMIT_PER_MINUTE`, `LOG_LEVEL`,
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_DATA`.

Locally the defaults need no Docker: `STORAGE_DRIVER=local` writes to `apps/api/uploads/`,
`MAIL_DRIVER=log` prints emails, and the throttler stays in memory without `REDIS_URL`.

---

## Seeding

`prisma/seed.ts` is idempotent (upserts + guarded inserts; admin-edited settings and email bodies are
never overwritten). Bulk content lives in `prisma/seed-data/`.

Always seeded: roles/permissions (`ROLE_PERMISSIONS`), the super admin, all settings groups, all email
templates, 12 services, 8 technology categories with 27 technologies.

With `SEED_DEMO_DATA=true`: 5 staff users + 1 candidate, 6 departments, 10 published jobs, 6 team
members, 6 testimonials, 4 case studies, 3 blog categories + 8 tags + 6 posts, 8 leads, 4 applications
with history/notes and one interview with feedback, notifications, and ~4,200 page views over 90 days.

Default logins (development only — change `SEED_ADMIN_PASSWORD` before any real deployment):

| Account | Email | Password |
| --- | --- | --- |
| Super admin | `SEED_ADMIN_EMAIL` (`admin@kmgtek.com`) | `SEED_ADMIN_PASSWORD` (`ChangeMe123!`) |
| HR / Recruiter / Hiring manager / Editor / Sales | `hr@` `recruiter@` `manager@` `editor@` `sales@kmgtek.com` | `Demo@12345` |
| Candidate | `candidate@example.com` | `Demo@12345` |

---

## Testing

```bash
pnpm --filter @kmg/api test        # unit: auth/lockout/rotation, pagination, exception filter, uploads
pnpm --filter @kmg/api test:e2e    # boots the app against <db>_test (override with TEST_DATABASE_URL)
```

`test:e2e` runs `prisma migrate deploy` + the base seed against the test database first. Unit tests
must not touch the database or network — inject fakes as in `test/unit/auth.service.spec.ts`.
