# Security

Security controls implemented in the KmgTechnologies platform, and how to report a problem.
The platform stores personal data (candidate profiles, résumés, contact details), so the private
bucket and the audit trail are treated as production-critical, not nice-to-haves.

## Reporting a vulnerability

Email **security@kmgtek.com** (or [contactus@kmgtek.com](mailto:contactus@kmgtek.com) if that
address bounces) with a description, affected URL/endpoint, reproduction steps and impact. Please do
not open a public issue, do not access or modify data that is not yours, and do not run automated
scanners against production.

- Acknowledgement within **2 business days**; triage and severity within **5 business days**.
- Fix targets: critical **72 h**, high **7 days**, medium **30 days**.
- We will keep you updated and credit you when the fix ships, unless you prefer to stay anonymous.

Out of scope: missing security headers without a demonstrated impact, rate-limit findings from
credential stuffing, reports from automated tools without a working proof of concept, social
engineering, and anything affecting only the seeded demo data on a development environment.

---

## 1. Authentication

- **Passwords**: bcrypt (cost ≥12), never logged, never returned. Minimum length and complexity are
  enforced by a shared Zod schema so the web and API agree.
- **Access tokens**: HS256 JWT, 15-minute TTL, carried in `Authorization: Bearer`. The web app keeps
  them **in memory only** — never in `localStorage`, so XSS cannot exfiltrate a long-lived token.
- **Refresh tokens**: opaque 256-bit random values, stored **hashed** (SHA-256) in `refresh_tokens`,
  delivered as `kmg_rt` — `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Max-Age=30d`.
  The narrow `Path` means the cookie is not attached to ordinary API calls.
- **Rotation + reuse detection**: every refresh issues a new token and revokes the old one. Presenting
  an already-revoked token is treated as theft: the whole token _family_ is revoked and the session
  ends everywhere. Password reset and password change revoke all families.
- **Account lockout**: 5 consecutive failed logins lock the account for 15 minutes; attempts are
  counted server-side, and the login endpoint is additionally rate limited (10/min/IP).
- **OAuth**: Google and LinkedIn via Passport with `state` validation; provider identities are linked
  to a user record; social accounts are created as `CANDIDATE` only.
- **Session hint cookie** `kmg_session=1` is non-secret and non-authoritative — it only lets the Next
  middleware avoid a round trip. Authorization is always re-verified by the API.

## 2. Authorization (RBAC)

Roles map to `<resource>:<action>` permissions in one place —
[`packages/shared/src/constants.ts`](../packages/shared/src/constants.ts) (`ROLE_PERMISSIONS`) — which
the API enforces with a `PermissionsGuard` on every admin route, and which the admin UI uses to build
its navigation. The web UI hiding a button is convenience; the guard is the control.

<!-- Generated from ROLE_PERMISSIONS — regenerate when the constant changes. -->

| Permission            | Super Admin | HR  | Recruiter | Hiring Manager | Content Editor | Sales | Candidate |
| --------------------- | :---------: | :-: | :-------: | :------------: | :------------: | :---: | :-------: |
| `dashboard:read`      |     ✅      | ✅  |    ✅     |       ✅       |       ✅       |  ✅   |     —     |
| `analytics:read`      |     ✅      | ✅  |     —     |       —        |       —        |   —   |     —     |
| `users:read`          |     ✅      | ✅  |     —     |       —        |       —        |   —   |     —     |
| `users:write`         |     ✅      |  —  |     —     |       —        |       —        |   —   |     —     |
| `roles:write`         |     ✅      |  —  |     —     |       —        |       —        |   —   |     —     |
| `jobs:read`           |     ✅      | ✅  |    ✅     |       ✅       |       —        |   —   |     —     |
| `jobs:write`          |     ✅      | ✅  |    ✅     |       —        |       —        |   —   |     —     |
| `applications:read`   |     ✅      | ✅  |    ✅     |       ✅       |       —        |   —   |     —     |
| `applications:write`  |     ✅      | ✅  |    ✅     |       —        |       —        |   —   |     —     |
| `interviews:read`     |     ✅      | ✅  |    ✅     |       ✅       |       —        |   —   |     —     |
| `interviews:write`    |     ✅      | ✅  |    ✅     |       —        |       —        |   —   |     —     |
| `interviews:feedback` |     ✅      | ✅  |    ✅     |       ✅       |       —        |   —   |     —     |
| `leads:read`          |     ✅      | ✅  |     —     |       —        |       —        |  ✅   |     —     |
| `leads:write`         |     ✅      |  —  |     —     |       —        |       —        |  ✅   |     —     |
| `leads:assign`        |     ✅      |  —  |     —     |       —        |       —        |   —   |     —     |
| `content:read`        |     ✅      |  —  |     —     |       —        |       ✅       |   —   |     —     |
| `content:write`       |     ✅      |  —  |     —     |       —        |       ✅       |   —   |     —     |
| `blog:publish`        |     ✅      |  —  |     —     |       —        |       ✅       |   —   |     —     |
| `settings:read`       |     ✅      | ✅  |     —     |       —        |       —        |   —   |     —     |
| `settings:write`      |     ✅      |  —  |     —     |       —        |       —        |   —   |     —     |
| `audit:read`          |     ✅      |  —  |     —     |       —        |       —        |   —   |     —     |
| `uploads:write`       |     ✅      | ✅  |    ✅     |       —        |       ✅       |   —   |     —     |

`CANDIDATE` holds no admin permissions at all: the portal is reachable only through `/me/*` routes
that scope every query to the authenticated candidate's own id. Staff roles (everything except
`CANDIDATE`) are the only ones allowed into `/admin`.

## 3. Input validation & output encoding

- Every request body, query and param is parsed with a **Zod** schema from `@kmg/shared` through a
  global validation pipe; unknown keys are stripped, so mass assignment is not possible.
- Errors come back as a stable `ApiErrorBody` with a `details[]` array — no stack traces, no ORM
  messages, no internal paths in production.
- **Prisma** parameterises all queries; no string-built SQL.
- Rich text from the blog/case-study editors is sanitised server-side with `sanitize-html`
  (allow-list of tags/attributes) before storage, and React escapes by default on render.
- Pagination is capped (`pageSize` ≤ 100) and sorting only accepts allow-listed fields, so a query
  parameter cannot turn into a table scan.

## 4. Upload security

Enforced from `UPLOAD_RULES` in `@kmg/shared` — the client pre-checks, the API decides:

| Purpose                         | Max size | Allowed types                    | Bucket      |
| ------------------------------- | -------- | -------------------------------- | ----------- |
| Résumé, cover letter            | 5 MB     | PDF, DOC, DOCX                   | **private** |
| Avatar, logo                    | 2 MB     | PNG, JPEG, WebP (+SVG for logos) | public      |
| Blog / case-study / team images | 5 MB     | PNG, JPEG, WebP (+GIF for blog)  | public      |
| General                         | 10 MB    | PNG, JPEG, WebP, PDF             | public      |

- The declared MIME type **and** the file's magic bytes must both be in the allow-list; a mismatch is
  rejected. Nginx caps the request body at 12 MB as a second line of defence.
- Stored under random opaque keys — no user-controlled paths, no original filename in the key.
- Résumés live in `kmg-private` with public access blocked. They are served only through
  `GET /api/v1/files/:id`, which authorizes (owner candidate, or staff with `applications:read`) and
  then redirects to a signed URL valid for 5 minutes.
- SVGs are only accepted for logos (admin-only, `uploads:write`) because SVG can carry script; they
  are served from the bucket/CDN origin, not from the app origin.

## 5. Transport, headers and CSRF

- HTTPS everywhere in deployed environments; HTTP redirects to HTTPS; HSTS with `includeSubDomains`.
- `helmet` in the API and nginx/ingress add `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` and `Cross-Origin-Opener-Policy`. `server_tokens off` hides the nginx version.
- **CSP** is emitted by the Next.js middleware, which owns the per-request nonce for inline scripts.
- **CORS** is an explicit allow-list (`CORS_ORIGINS`) with credentials enabled — no wildcards.
- **CSRF**: bearer-token endpoints are not CSRF-susceptible. The two cookie-authenticated endpoints
  (`/auth/refresh`, `/auth/logout`) additionally require an `X-Requested-With: XMLHttpRequest` header
  (which a cross-site form cannot set without a preflight) and an `Origin` on the allow-list, on top
  of `SameSite=Lax` and the narrow cookie path.

## 6. Rate limiting & abuse prevention

| Scope                          | Limit                                                            |
| ------------------------------ | ---------------------------------------------------------------- |
| Global default                 | `RATE_LIMIT_PER_MINUTE` (120) per IP                             |
| `POST /auth/login` and friends | 10–20/min per IP + account lockout after 5 failures              |
| `POST /contact`                | 5/min per IP + hidden honeypot field (`website`)                 |
| `POST /jobs/:slug/apply`       | 10/min per IP; duplicate application to the same job → `409`     |
| Blog comments                  | Rate limited and held for moderation (never rendered unapproved) |

Limits are enforced twice: at the edge (nginx `limit_req` zones / ingress annotations) and in the API
(`@nestjs/throttler`). With more than one replica, set `REDIS_URL` so counters are shared — otherwise
each pod counts separately and the effective limit multiplies by the replica count.

## 7. Auditing & logging

- Every mutating admin action writes an `AuditLog` row: actor, action, entity type/id, changed fields
  and IP. `audit:read` (Super Admin) is required to read it, and the log is append-only.
- Logs are structured JSON (pino) with a `requestId` that is also returned to the client, so an
  incident can be reconstructed end to end.
- **Never logged**: passwords, tokens, cookies, `Authorization` headers, full request bodies of auth
  endpoints. Personal data in logs is limited to ids where possible.

## 8. Infrastructure hardening

- Containers run as a **non-root** user (uid 1000) with `allowPrivilegeEscalation: false`, all
  capabilities dropped, `seccompProfile: RuntimeDefault`, and a read-only root filesystem for the API
  and migration Job (writable `/tmp` only). Namespaces enforce the _restricted_ Pod Security Standard.
- **NetworkPolicies** default-deny ingress and egress; only ingress→web/api, web→api, api→(database,
  cache, object storage, SMTP, OAuth) and DNS are permitted, with the cloud metadata endpoint
  (169.254.169.254) explicitly blocked to defeat SSRF-to-credential-theft.
- Images are minimal multi-stage builds with no build toolchain or devDependencies in the runtime
  layer, and carry OCI provenance/SBOM metadata from the release workflow.
- Secrets never live in git or in an image layer: External Secrets/Sealed Secrets in Kubernetes, an
  ignored `.env` locally. `.dockerignore` excludes `.env*`, keys and certificates from the build context.

## 9. Dependency & supply-chain security

- `pnpm install --frozen-lockfile` everywhere; the lockfile is committed and reviewed.
- **Dependabot** (`.github/dependabot.yml`) opens grouped weekly PRs for npm, GitHub Actions and the
  Docker base images.
- **Trivy** scans both published images for OS and library CVEs on every release; results are uploaded
  to GitHub code scanning and CRITICAL findings fail the pipeline.
- Third-party GitHub Actions should be pinned to full commit SHAs; Dependabot keeps the pins moving.
- Builds are reproducible from the repository root context only — no network fetches of scripts at
  image build time beyond the package registries.

## 10. Data protection

- Encryption in transit (TLS to the edge, `sslmode=require` to the database, `rediss://` to the cache)
  and at rest (managed disk/bucket encryption, SSE-KMS for S3).
- Candidate data has a retention policy: applications and résumés are purged or anonymised on request
  (`DELETE` on the candidate cascades to résumés and saved jobs; audit rows keep only ids).
- The seed data and demo accounts must never be enabled in production (`SEED_DEMO_DATA=false`), and
  the initial admin password must be changed at first login.
