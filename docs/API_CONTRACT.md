# API Contract (v1)

This is the binding contract between `apps/api` (NestJS) and `apps/web` (Next.js).
Types referenced here live in `packages/shared/src/types.ts`; request validation schemas
live in `packages/shared/src/schemas/*`. The live OpenAPI spec is served at `/api/docs`.

## Conventions

- Base path: **`/api/v1`**. Health probes: `GET /health/live`, `GET /health/ready` (unversioned, no prefix).
- JSON everywhere, except uploads (`multipart/form-data`).
- Success, single resource: `{ "data": T }`.
- Success, list: `{ "data": T[], "meta": { page, pageSize, total, totalPages } }`.
- `204 No Content` for deletes.
- Error: `ApiErrorBody` → `{ statusCode, error, message, details?: [{path, message}], path, timestamp, requestId }`.
  Validation errors are `400` with `details`.
- Pagination query: `page` (1-based), `pageSize` (max 100), `search`, `sort=<field>:<asc|desc>`.
- Dates are ISO-8601 strings (UTC).
- Every response carries `X-Request-Id`.

## Authentication

- **Access token**: JWT (HS256, 15 min), returned in the body, sent as `Authorization: Bearer <token>`.
  The web app keeps it in memory only.
- **Refresh token**: opaque random token, stored hashed in `refresh_tokens`, set as cookie
  `kmg_rt` (`HttpOnly; Secure (prod); SameSite=Lax; Path=/api/v1/auth; Max-Age=30d`). Rotated on every refresh;
  reuse of a revoked token revokes the entire family.
- A non-HttpOnly cookie `kmg_session=1` (same lifetime, `Path=/`) is set alongside so Next.js
  middleware can cheaply guess whether a session exists. It carries no secrets.
- **CSRF**: cookie-authenticated endpoints (`/auth/refresh`, `/auth/logout`) require header
  `X-Requested-With: XMLHttpRequest` and a matching `Origin` (allow-list from `CORS_ORIGINS`).
  All other endpoints use bearer tokens and are not CSRF-susceptible.
- The web app proxies `/api/v1/*` to the API via a Next.js rewrite (and Nginx does the same in production),
  so the browser talks to a single origin.
- JWT payload: `{ sub: userId, email, roles: RoleName[], perms: Permission[], cid?: candidateId }`.

| Method | Path                                         | Body                  | Response                                             | Notes                                                          |
| ------ | -------------------------------------------- | --------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| POST   | `/auth/register`                             | `RegisterInput`       | `AuthResponse` + cookies                             | Creates CANDIDATE user + candidate profile                     |
| POST   | `/auth/login`                                | `LoginInput`          | `AuthResponse` + cookies                             | Lockout after 5 failed attempts (15 min). Rate limited 10/min  |
| POST   | `/auth/refresh`                              | –                     | `AuthResponse` + rotated cookies                     | CSRF header required                                           |
| POST   | `/auth/logout`                               | –                     | 204, clears cookies                                  | CSRF header required                                           |
| GET    | `/auth/me`                                   | –                     | `{ data: AuthUser }`                                 |                                                                |
| POST   | `/auth/forgot-password`                      | `ForgotPasswordInput` | 204 (always)                                         | Sends email with reset link `${WEB_URL}/reset-password?token=` |
| POST   | `/auth/reset-password`                       | `ResetPasswordInput`  | 204                                                  | Revokes all refresh tokens                                     |
| POST   | `/auth/change-password`                      | `ChangePasswordInput` | 204                                                  | Auth required                                                  |
| GET    | `/auth/google`                               | –                     | 302 to Google                                        | Enabled when `GOOGLE_CLIENT_ID` set                            |
| GET    | `/auth/google/callback`                      | –                     | sets cookies, 302 → `${WEB_URL}/auth/callback?next=` | Creates CANDIDATE if new                                       |
| GET    | `/auth/linkedin` / `/auth/linkedin/callback` | –                     | same as Google                                       | Enabled when `LINKEDIN_CLIENT_ID` set                          |
| GET    | `/auth/providers`                            | –                     | `{ data: { google: boolean, linkedin: boolean } }`   | Which social logins are configured                             |

`/auth/callback` on the web calls `POST /auth/refresh` to obtain an access token, then redirects to `next`
(staff → `/admin`, candidate → `/portal`).

## Public (no auth)

| Method | Path                         | Query/Body                                                              | Response                                                                                    |
| ------ | ---------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| GET    | `/settings/public`           | –                                                                       | `{ data: WebsiteSettings }` (no `email` group)                                              |
| GET    | `/content-blocks`            | –                                                                       | `{ data: Record<ContentBlockKey, unknown> }` — every key, merged over `DEFAULT_CONTENT_BLOCKS` so unset keys still return usable data |
| GET    | `/content-blocks/:key`       | –                                                                       | `{ data: unknown }` — one key's data (default-merged); `404` for an unknown key             |
| GET    | `/services`                  | –                                                                       | `{ data: Service[] }` (published, ordered)                                                  |
| GET    | `/services/:slug`            | –                                                                       | `{ data: Service }`                                                                         |
| GET    | `/technologies`              | –                                                                       | `{ data: TechnologyCategory[] }` (with nested technologies)                                 |
| GET    | `/case-studies`              | `page,pageSize,industry,featured`                                       | `Paginated<CaseStudy>`                                                                      |
| GET    | `/case-studies/:slug`        | –                                                                       | `{ data: CaseStudy }`                                                                       |
| GET    | `/testimonials`              | `featured`                                                              | `{ data: Testimonial[] }`                                                                   |
| GET    | `/team-members`              | `leadership`                                                            | `{ data: TeamMember[] }`                                                                    |
| GET    | `/blog/posts`                | `page,pageSize,search,category(slug),tag(slug)`                         | `Paginated<BlogPostSummary>` (published only)                                               |
| GET    | `/blog/posts/:slug`          | –                                                                       | `{ data: BlogPost & { related: BlogPostSummary[] } }` — increments views                    |
| GET    | `/blog/categories`           | –                                                                       | `{ data: BlogCategory[] }` (with postCount)                                                 |
| GET    | `/blog/tags`                 | –                                                                       | `{ data: Tag[] }`                                                                           |
| GET    | `/blog/posts/:slug/comments` | –                                                                       | `{ data: BlogComment[] }` (approved only)                                                   |
| POST   | `/blog/posts/:slug/comments` | `BlogCommentInput`                                                      | 201 `{ data: { id, approved:false } }` — moderated. Rate limited                            |
| GET    | `/jobs`                      | `JobsQuery`                                                             | `Paginated<JobSummary>` (PUBLISHED & not past closingDate)                                  |
| GET    | `/jobs/facets`               | –                                                                       | `{ data: JobFacets }`                                                                       |
| GET    | `/jobs/:slug`                | –                                                                       | `{ data: Job & { similar: JobSummary[] } }`                                                 |
| POST   | `/jobs/:slug/apply`          | multipart: `JobApplicationInput` fields + files `resume`, `coverLetter` | 201 `{ data: { applicationId, candidateAccountCreated: boolean } }`                         |
| POST   | `/contact`                   | `ContactInput`                                                          | 201 `{ data: { id } }`. Rate limited 5/min per IP. Honeypot `website`                       |
| GET    | `/search`                    | `q` (min 2 chars), `limit` (default 5)                                  | `{ data: SearchResults }`                                                                   |
| POST   | `/analytics/track`           | `TrackEventInput`                                                       | 204. UA parsed server-side for device/browser/os                                            |
| GET    | `/sitemap`                   | –                                                                       | `{ data: { services: {slug,updatedAt}[], posts: [...], jobs: [...], caseStudies: [...] } }` |
| GET    | `/files/:id`                 | –                                                                       | 302 to (signed) URL. Private files require auth: owner candidate or `applications:read`     |

**Apply flow**: optional auth. If the bearer token belongs to a candidate, the application links to them
(and `resumeId` may reference one of their stored resumes instead of uploading). Otherwise the API finds or
creates a `User` (no password, status `INVITED`) + `Candidate` by email; `candidateAccountCreated=true` means the
candidate got a "set your password" email so they can track the application in the portal.
Duplicate application to the same job → `409`. Emits `application.created` → emails candidate + notifies staff.

## Candidate portal (role CANDIDATE)

| Method | Path                            | Body                    | Response                                                                                                                                                                                        |
| ------ | ------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/me/profile`                   | –                       | `{ data: CandidateProfile }`                                                                                                                                                                    |
| PATCH  | `/me/profile`                   | `CandidateProfileInput` | `{ data: CandidateProfile }`                                                                                                                                                                    |
| PUT    | `/me/skills`                    | `CandidateSkillsInput`  | `{ data: CandidateProfile['skills'] }`                                                                                                                                                          |
| POST   | `/me/avatar`                    | multipart `file`        | `{ data: { avatarUrl } }`                                                                                                                                                                       |
| GET    | `/me/resumes`                   | –                       | `{ data: Resume[] }`                                                                                                                                                                            |
| POST   | `/me/resumes`                   | multipart `file`        | 201 `{ data: Resume }`                                                                                                                                                                          |
| PATCH  | `/me/resumes/:id/primary`       | –                       | `{ data: Resume }`                                                                                                                                                                              |
| DELETE | `/me/resumes/:id`               | –                       | 204                                                                                                                                                                                             |
| GET    | `/me/saved-jobs`                | –                       | `{ data: JobSummary[] }`                                                                                                                                                                        |
| POST   | `/me/saved-jobs/:jobId`         | –                       | 204                                                                                                                                                                                             |
| DELETE | `/me/saved-jobs/:jobId`         | –                       | 204                                                                                                                                                                                             |
| GET    | `/me/applications`              | `page,pageSize,status`  | `Paginated<JobApplication>` (no notes)                                                                                                                                                          |
| GET    | `/me/applications/:id`          | –                       | `{ data: JobApplication }` (history + upcoming interviews without feedback)                                                                                                                     |
| POST   | `/me/applications/:id/withdraw` | –                       | `{ data: JobApplication }`                                                                                                                                                                      |
| GET    | `/me/dashboard`                 | –                       | `{ data: { applications: number, active: number, interviews: number, savedJobs: number, profileCompleteness: number, recentApplications: JobApplication[], upcomingInterviews: Interview[] } }` |

## Notifications (any authenticated user)

| Method | Path                          | Response                                     |
| ------ | ----------------------------- | -------------------------------------------- |
| GET    | `/notifications`              | `Paginated<AppNotification>` + `meta.unread` |
| GET    | `/notifications/unread-count` | `{ data: { count } }`                        |
| PATCH  | `/notifications/:id/read`     | 204                                          |
| POST   | `/notifications/read-all`     | 204                                          |

## Admin (staff roles; permission in brackets)

All under `/admin`. List endpoints accept `page,pageSize,search,sort` plus listed filters. Every mutating
admin call writes an `AuditLog` row.

**Dashboard & analytics**

- `GET /admin/dashboard/summary` [dashboard:read] → `DashboardSummary`
- `GET /admin/dashboard/charts?months=12` [dashboard:read] → `DashboardCharts`
- `GET /admin/analytics?from&to` [analytics:read] → `AnalyticsReport`

**Users & RBAC**

- `GET/POST /admin/users`, `GET/PATCH/DELETE /admin/users/:id` [users:read / users:write] — `StaffUserUpsertInput`, list filter `role,status` → `StaffUser`
- `GET /admin/users/assignable?permission=interviews:feedback|leads:write` [users:read or jobs:read] → `{ id, name, email }[]` (for interviewer / assignee / hiring-manager pickers)
- `GET /admin/roles` [users:read] → `RoleWithPermissions[]`; `PUT /admin/roles/:id/permissions` [roles:write] `{ permissions: Permission[] }`
- `GET /admin/audit-logs?actorId&entityType&from&to` [audit:read] → `Paginated<AuditLogEntry>`

**Jobs** [jobs:read / jobs:write]

- `GET /admin/jobs?status&departmentId&workMode&employmentType` → `Paginated<JobSummary>` (includes applicationCount)
- `POST /admin/jobs`, `GET/PATCH/DELETE /admin/jobs/:id` — `JobUpsertInput` → `Job`
- `POST /admin/jobs/:id/duplicate` → `Job`
- `GET/POST /admin/job-categories`, `PATCH/DELETE /admin/job-categories/:id` — `{ name, slug? }`

**Applications** [applications:read / applications:write]

- `GET /admin/applications?jobId&status&minRating&source&from&to&sort` → `Paginated<JobApplication>`
- `GET /admin/applications/:id` → `JobApplication` (with notes, interviews, history)
- `PATCH /admin/applications/:id/status` `ApplicationStatusUpdateInput` — writes history, notifies candidate (email + in-app); OFFER triggers `offer.released`
- `PATCH /admin/applications/:id/rating` `{ rating }`
- `POST /admin/applications/:id/notes` `{ content }` → `ApplicationNote`
- `GET /admin/applications/:id/resume?download=1` → 302 to short-lived signed URL (`Content-Disposition` attachment when download=1, inline otherwise)
- `POST /admin/applications/bulk` `ApplicationBulkInput` → `{ data: { affected } }`; `action=export` returns `text/csv`
- `GET /admin/applications/export?…filters` → `text/csv`

**Interviews** [interviews:read / interviews:write / interviews:feedback]

- `GET /admin/interviews?from&to&status&interviewerId&applicationId&mine=true` → `Paginated<Interview>`
- `POST /admin/interviews`, `GET/PATCH/DELETE /admin/interviews/:id` — `InterviewUpsertInput`. When
  `generateMeetingLink` and no `meetingUrl`, the API generates one via `MeetingProvider`
  (default: Jitsi `https://meet.jit.si/kmg-<random>`; pluggable for Google Meet / Zoom / Teams).
  Emits `interview.scheduled` → emails candidate + interviewers (with `.ics` attachment).
- `POST /admin/interviews/:id/feedback` [interviews:feedback] `InterviewFeedbackInput` — one per interviewer (upsert)

**Leads** [leads:read / leads:write / leads:assign]

- `GET /admin/leads?status&assignedToId&serviceId&from&to` → `Paginated<ContactLead>`
- `GET /admin/leads/:id` (marks read), `PATCH /admin/leads/:id` `LeadUpdateInput`, `DELETE /admin/leads/:id`
- `POST /admin/leads/:id/notes` `{ content }`
- `GET /admin/leads/export` → `text/csv`

**Content** [content:read / content:write; publishing a post requires blog:publish]

- Blog: `/admin/blog/posts` (filters `status,categoryId,tag`), `/admin/blog/posts/:id`, `/admin/blog/categories`, `/admin/blog/tags`,
  `GET /admin/blog/comments?approved`, `PATCH /admin/blog/comments/:id` `{ approved }`, `DELETE /admin/blog/comments/:id`
- `/admin/testimonials`, `/admin/team-members`, `/admin/case-studies`, `/admin/services`,
  `/admin/technologies`, `/admin/technology-categories` — standard CRUD (`GET list`, `POST`, `GET :id`, `PATCH :id`, `DELETE :id`)
  using the matching `*UpsertSchema`. Admin lists include unpublished records.
- `PATCH /admin/<resource>/reorder` `{ ids: string[] }` for services, team-members, testimonials, technologies

**Settings** [settings:read / settings:write]

- `GET /admin/settings` → `WebsiteSettings` (including `email`)
- `PUT /admin/settings/:group` → body is that group's object
- `GET /admin/email-templates`, `GET/PUT /admin/email-templates/:id` `EmailTemplateUpdateInput`
- `POST /admin/email-templates/:id/test` `{ to }` → sends a test email

**Content blocks** [content:read / content:write] — every marketing-copy section (hero,
pillar lists, industries, about/careers/contact page copy) an admin can edit without a code
change. Keys and shapes are the `CONTENT_BLOCK_SCHEMAS` registry in `@kmg/shared`.

- `GET /admin/content-blocks` → `{ data: Array<{ key, label, group, data, updatedAt }> }` — every key, default-merged, for the `/admin/content` list
- `GET /admin/content-blocks/:key` → `{ data: { key, data, updatedAt } }`
- `PUT /admin/content-blocks/:key` → body validated against that key's zod schema (`400` with `details` on mismatch); upserts the row. `@Audit('content_block.update', 'ContentBlock')`
- `POST /admin/content-blocks/:key/reset` → deletes the row, reverting the key to its default

**Uploads** [uploads:write]

- `POST /admin/uploads` multipart `file` + `purpose` (UploadPurpose) → `{ data: FileRef & { key } }`
  Validation: size + MIME from `UPLOAD_RULES`, plus magic-byte sniffing. Public purposes return a public URL.

## Events (in-process, `@nestjs/event-emitter`)

| Event                           | Payload                       | Handlers                                                                                   |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `application.created`           | applicationId                 | email candidate + admins (`application.received.*`), in-app notification for recruiters/HR |
| `application.status_changed`    | applicationId, from, to, note | email `application.status_updated` / `offer.released`, in-app notification to candidate    |
| `interview.scheduled`           | interviewId                   | email `interview.scheduled` to candidate + interviewers, in-app notifications              |
| `lead.created`                  | leadId                        | email `contact.received.admin` + `contact.received.visitor`, notify SALES/SUPER_ADMIN      |
| `lead.assigned`                 | leadId, assigneeId            | in-app notification + email                                                                |
| `user.password_reset_requested` | userId, token                 | email `auth.password_reset`                                                                |
