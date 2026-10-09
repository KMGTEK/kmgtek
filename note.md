# KmgTechnologies Platform

> **Connecting Exceptional Talent with Exceptional Opportunities**

The corporate website, lead-generation engine and recruitment platform of **KMG Technologies** —
an IT consulting and talent solutions company (Cloud, DevOps, Platform Engineering, AI).

One monorepo, two deployables: a **NestJS** REST API and a **Next.js** front end that serves the
public site, the candidate portal and the staff admin portal.

|            |                                                     |
| ---------- | --------------------------------------------------- |
| 📧 Contact | [contactus@kmgtek.com](mailto:contactus@kmgtek.com) |
| 📍 Office  | 180 Talmadge Rd, Suite# 599, Edison, NJ 08817       |

---

## Features

**Public website**

- Services, technologies, case studies, testimonials, team and company pages
- Blog with categories, tags, moderated comments and full-text search
- Contact form with honeypot + rate limiting, routed to the Sales queue as a lead
- SEO: sitemap, OpenGraph, JSON-LD, ISR-rendered content

**Careers & candidate portal**

- Job board with faceted search (department, work mode, employment type, location)
- Apply with or without an account (resume + cover letter upload, magic "set your password" invite)
- Candidate dashboard: applications with status timeline, saved jobs, interviews, résumé library, profile completeness

**Admin portal (RBAC)**

- Dashboard and analytics, hiring pipeline, interview scheduling with feedback forms,
  lead management, content authoring (blog/case studies/services), website settings,
  email templates, audit log, user & role administration

| Role               | Scope                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| **Super Admin**    | Everything, including roles, settings and audit logs                    |
| **HR**             | Jobs, applications, interviews, analytics, read-only users and leads    |
| **Recruiter**      | Jobs, applications, interviews and feedback                             |
| **Hiring Manager** | Read-only pipeline for their jobs + interview feedback                  |
| **Content Editor** | Blog, case studies, services, testimonials, uploads (may publish posts) |
| **Sales**          | Leads (read/write) and the dashboard                                    |
| **Candidate**      | Own profile, résumés, applications and saved jobs (portal only)         |

The permission matrix is defined once in [`packages/shared/src/constants.ts`](packages/shared/src/constants.ts)
(`ROLE_PERMISSIONS`) and enforced by the API — see [docs/SECURITY.md](docs/SECURITY.md).

---

## Tech stack

| Layer     | Choice                                                                                        |
| --------- | --------------------------------------------------------------------------------------------- |
| Front end | Next.js 16 (App Router, RSC, ISR), React 19, Tailwind CSS 4, Radix UI, TanStack Query & Table |
| API       | NestJS 11, Zod validation, Swagger/OpenAPI, Passport (JWT + Google/LinkedIn OAuth)            |
| Data      | PostgreSQL 16+ via Prisma 6, Redis (rate-limit store & cache)                                 |
| Storage   | S3-compatible object storage (AWS S3 in production, MinIO locally)                            |
| Email     | Nodemailer + Handlebars templates (Mailpit locally, SES/Postmark in production)               |
| Tooling   | pnpm 11 workspaces, TypeScript 5.9, Jest (API), Vitest (web), ESLint, Prettier                |
| Delivery  | Docker multi-stage images, docker compose, Kustomize manifests, GitHub Actions → GHCR         |

## Monorepo layout

```
kmg/
├── apps/
│   ├── api/                  # @kmg/api — NestJS REST API (port 4000)
│   │   └── prisma/           # schema.prisma, migrations, seed.ts
│   └── web/                  # @kmg/web — Next.js site + portals (port 3000)
├── packages/
│   └── shared/               # @kmg/shared — types, zod schemas, constants, static content
├── infra/
│   ├── docker/               # api.Dockerfile, web.Dockerfile, entrypoint
│   ├── nginx/                # edge proxy config for the compose stack
│   └── k8s/                  # Kustomize base + staging/production overlays
├── docs/                     # API contract, architecture, deployment, security
├── docker-compose.yml        # full production-like stack behind nginx
├── docker-compose.dev.yml    # backing services only, for `pnpm dev`
└── Makefile                  # make help
```

`@kmg/shared` is consumed by both apps and **must be built before them** (`pnpm --filter @kmg/shared build`);
every root script already does this for you.

---

## Quick start

**Prerequisites:** Node 22 (`.nvmrc`), pnpm 11 (`corepack enable`), Docker (for the backing services).

### Option A — hybrid (recommended for development)

```bash
git clone <repo> kmg && cd kmg
cp .env.example .env                              # defaults match the dev compose file
docker compose -f docker-compose.dev.yml up -d    # postgres, redis, minio(+buckets), mailpit
pnpm install
pnpm db:migrate                                   # prisma migrate dev
pnpm db:seed                                      # roles, settings, admin + demo content
pnpm dev                                          # api :4000 and web :3000 with hot reload
```

### Option B — everything in containers

```bash
cp .env.example .env        # set NEXT_PUBLIC_SITE_URL=http://localhost, review secrets
docker compose up -d --build
docker compose --profile seed run --rm seed
```

The whole stack is then served by nginx on <http://localhost>. The API applies its Prisma
migrations automatically on start (`RUN_MIGRATIONS=true`).

### URLs

| Service           | Option A (dev)                   | Option B (compose)          |
| ----------------- | -------------------------------- | --------------------------- |
| Website + portals | <http://localhost:3000>          | <http://localhost>          |
| REST API          | <http://localhost:4000/api/v1>   | <http://localhost/api/v1>   |
| Swagger UI        | <http://localhost:4000/api/docs> | <http://localhost/api/docs> |
| Health probes     | `/health/live`, `/health/ready`  | same                        |
| MinIO console     | <http://localhost:9001>          | <http://localhost:9001>     |
| Mailpit inbox     | <http://localhost:8025>          | <http://localhost:8025>     |

### Seeded credentials

> Development only. Change `SEED_ADMIN_PASSWORD` and every demo account before any public deployment.

| Account               | Password       | Role           |
| --------------------- | -------------- | -------------- |
| admin@kmgtek.com      | `ChangeMe123!` | Super Admin    |
| hr@kmgtek.com         | `Demo@12345`   | HR             |
| recruiter@kmgtek.com  | `Demo@12345`   | Recruiter      |
| manager@kmgtek.com    | `Demo@12345`   | Hiring Manager |
| editor@kmgtek.com     | `Demo@12345`   | Content Editor |
| sales@kmgtek.com      | `Demo@12345`   | Sales          |
| candidate@example.com | `Demo@12345`   | Candidate      |

Demo users are only created when `SEED_DEMO_DATA=true`.

---

## Scripts

| Command            | What it does                                                     |
| ------------------ | ---------------------------------------------------------------- |
| `pnpm dev`         | Build `@kmg/shared`, then run api + web (and the shared watcher) |
| `pnpm dev:api`     | API only (`nest start --watch`)                                  |
| `pnpm dev:web`     | Web only (`next dev`)                                            |
| `pnpm build`       | Build shared → api → web                                         |
| `pnpm lint`        | Lint every package                                               |
| `pnpm typecheck`   | `tsc --noEmit` everywhere                                        |
| `pnpm test`        | Unit tests (Jest for api, Vitest for web)                        |
| `pnpm db:generate` | `prisma generate`                                                |
| `pnpm db:migrate`  | `prisma migrate dev` (creates + applies a migration)             |
| `pnpm db:seed`     | Seed roles, settings, admin and demo content                     |
| `pnpm db:studio`   | Prisma Studio                                                    |
| `pnpm format`      | Prettier write                                                   |

`make help` lists the operational targets (`make dev`, `make up`, `make seed`, `make build-images`,
`make k8s-staging`, `make k8s-prod`, `make logs`, …).

## Documentation

| Document                                     | Contents                                                              |
| -------------------------------------------- | --------------------------------------------------------------------- |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Binding REST contract between api and web (every endpoint)            |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, request/auth flows, storage, caching, scaling, roadmap |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)     | Environment variables, compose, TLS, Kubernetes, backups, checklist   |
| [docs/SECURITY.md](docs/SECURITY.md)         | Security controls, RBAC matrix, vulnerability reporting               |
| [CONTRIBUTING.md](CONTRIBUTING.md)           | Coding standards, branching, commits, testing expectations            |
| [infra/k8s/README.md](infra/k8s/README.md)   | Kustomize layout and rendering                                        |

---

© KmgTechnologies LLC. All rights reserved. Proprietary — not licensed for redistribution.
