# Contributing

Thanks for working on the KmgTechnologies platform. This document is the short version of "how we
build here" — read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the why.

## Getting set up

```bash
corepack enable                                   # pnpm 11, pinned in package.json
docker compose -f docker-compose.dev.yml up -d    # postgres, redis, minio, mailpit
cp .env.example .env
pnpm install && pnpm db:migrate && pnpm db:seed
pnpm dev
```

Node 22 (see `.nvmrc`). If `@kmg/shared` types look stale, rebuild it: `pnpm --filter @kmg/shared build`.

## Branching

| Branch                                | Purpose                                                |
| ------------------------------------- | ------------------------------------------------------ |
| `main`                                | Always deployable; pushes deploy to **staging**        |
| `develop`                             | Integration branch when several features are in flight |
| `feat/<short-name>`                   | Feature work                                           |
| `fix/<short-name>`                    | Bug fixes                                              |
| `chore/`, `docs/`, `refactor/`, `ci/` | Everything else                                        |

Tags `v*.*.*` on `main` trigger a **production** release (gated by the `production` environment).
Branch from the branch you will target, keep branches short-lived, and rebase rather than merge
`main` into your branch.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) — the type drives the changelog and the
release tagging.

```
<type>(<scope>): <imperative summary>

[body: what changed and why, not how]
[BREAKING CHANGE: …]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Scopes: `api`, `web`, `shared`, `infra`, `docs`, or a module (`auth`, `jobs`, `applications`, …).

```
feat(jobs): add faceted search by work mode and department
fix(auth): revoke the whole token family on refresh-token reuse
chore(infra): pin the nginx image to 1.28-alpine
```

## Pull requests

- One logical change per PR; describe the _why_, link the issue, add screenshots for UI work.
- CI must be green: lint, typecheck, unit tests, API e2e, web build, both image builds.
- Update the docs in the same PR — especially [docs/API_CONTRACT.md](docs/API_CONTRACT.md) when an
  endpoint changes. The contract is binding for the other app.
- Database changes ship with a Prisma migration (`pnpm db:migrate`), never a hand-edited schema.
  Migrations must be backwards compatible with the previous release (expand → migrate → contract).
- At least one review before merge; squash-merge with a Conventional Commit title.

## Coding standards

**General**

- TypeScript strict mode; `any` needs a comment justifying it. Prefer `unknown` + a Zod parse.
- Prettier and ESLint are the style authority — `pnpm format` before pushing; don't argue with the formatter.
- Files and directories `kebab-case`; types/components `PascalCase`; variables/functions `camelCase`;
  constants `SCREAMING_SNAKE_CASE`.
- Shared enums, permissions, upload rules and request schemas belong in `packages/shared` — if the API
  and the web app both need to know it, it lives there exactly once.

**API (`apps/api`)**

- Controller → service → Prisma. Controllers validate and shape HTTP; services hold business rules and
  own transactions; no Prisma calls in controllers.
- Cross-module side effects go through domain events, not direct imports of another module's service.
- External systems sit behind an injected interface (`StorageService`, `MailService`, `MeetingProvider`).
- Every response follows the envelope in the API contract (`{ data }` / `{ data, meta }`), every error
  is an `ApiErrorBody`. Mutating admin routes write an audit entry.
- Guard every admin route with `@Permissions('<resource>:<action>')` — never rely on the UI hiding a button.

**Web (`apps/web`)**

- Server Components by default; add `'use client'` only for interactivity.
- Data fetching: server components for SSR/ISR, TanStack Query for client-side; never fetch the API
  from a client component with a secret.
- Forms: `react-hook-form` + the shared Zod schema via `@hookform/resolvers` — the same schema the API
  validates with.
- Styling: Tailwind + the existing design tokens and Radix primitives; no ad-hoc colour values.
- Accessibility is part of "done": semantic elements, labels, focus states, keyboard paths, and a
  Lighthouse a11y score ≥90.

## Testing expectations

| Change                                 | Expected tests                                                   |
| -------------------------------------- | ---------------------------------------------------------------- |
| API service / business rule            | Jest unit test with the Prisma client mocked                     |
| API endpoint (new or changed contract) | e2e test (`apps/api/test/*.e2e-spec.ts`) against the CI Postgres |
| Auth, RBAC, uploads, rate limiting     | e2e tests for both the allowed and the denied paths              |
| Web component with logic               | Vitest + Testing Library (behaviour, not implementation details) |
| Bug fix                                | A test that fails before the fix                                 |

```bash
pnpm test                          # all unit tests
pnpm --filter @kmg/api test:e2e    # needs the dev database running
pnpm lint && pnpm typecheck
```

Write tests from the user's perspective, keep them deterministic (no real network, no sleeps, fixed
clocks), and never assert on seeded demo data that a colleague might change.

## Security

Never commit secrets — `.env` is ignored, and `.env.example` documents the keys. Report vulnerabilities
privately as described in [docs/SECURITY.md](docs/SECURITY.md) instead of opening an issue.
