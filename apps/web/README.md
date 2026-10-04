# @kmg/web

Next.js 16 (App Router, Turbopack) app serving the public marketing site (`/`),
the candidate portal (`/portal/*`) and the admin portal (`/admin/*`) from one
deployment. This README is the foundation-layer handoff for the marketing,
portal and admin agents building on top of it — it documents every reusable
piece so you don't re-invent it.

Stack: React 19, Tailwind v4, shadcn/ui (`new-york` style, Radix under the hood),
TanStack Query v5 + Table v8, React Hook Form + Zod v4, `motion` (Framer Motion),
TipTap, `@kmg/shared` for cross-app types/schemas/content.

## Folder layout

```
src/
  app/                      # App Router. Route groups: (marketing), (auth), admin/, portal/
    (marketing)/layout.tsx  # SiteHeader + SiteFooter shell — public pages live here
    (marketing)/page.tsx    # Home page (placeholder hero/services/stats — replace freely)
    (auth)/layout.tsx       # Split-screen auth shell — put login/register/forgot/reset pages here
    admin/layout.tsx        # Sidebar + topbar shell, wrapped in <RequireStaff>
    portal/layout.tsx       # Left rail (desktop) / bottom tabs (mobile), wrapped in <RequireCandidate>
    design-system/page.tsx  # Internal component showcase (noindex, disallowed in robots.ts)
    layout.tsx              # Root: fonts, <Providers>, org/website JSON-LD, analytics
    globals.css             # Tailwind v4 + design tokens (see "Design rules" below)
    not-found.tsx / error.tsx / global-error.tsx / loading.tsx
    robots.ts / manifest.ts / icon.tsx / apple-icon.tsx / opengraph-image.tsx
  components/
    ui/            # shadcn primitives (button, card, dialog, table, sidebar, form, …) — generic, unbranded
    shared/         # Cross-app composites: DataTable, PageHeader, StatusBadge, EmptyState, skeletons, …
    forms/          # react-hook-form field components + useZodForm
    motion/         # Reveal, Stagger, Marquee, AnimatedCounter, PageTransition, FloatingIcons
    layout/         # SiteHeader, SiteFooter, AdminSidebar, Container, Section, PageHero, UserMenu, …
    brand/          # Logo (inline SVG, theme-aware), SocialIcons
  config/
    nav.ts          # Single source of truth for marketing/portal/admin nav — add links here, not in layouts
    site.ts         # siteConfig: name, description, CTAs, contact info
  lib/
    api/client.ts   # Browser fetch client — single-flight 401 refresh + retry-once
    api/server.ts   # RSC/server fetch — never throws, falls back to null/empty
    api/public.ts   # Typed server data functions for public content, with @kmg/shared fallbacks
    api/query-keys.ts # `qk` — the only place query keys are defined
    auth/           # AuthProvider/useAuth, RequireAuth/RequireStaff/RequireCandidate/Can, tokenStore
    seo.ts          # buildMetadata() + JSON-LD builders
    utils.ts        # cn, formatDate/Currency/Bytes/Number, truncate, initials, …
    env.ts          # publicEnv (browser-safe) / serverEnv() (server-only)
  hooks/            # useDebounce, useDebouncedCallback, useCopy, useMediaQuery, useMobile
  proxy.ts          # Edge gate for /admin/* and /portal/* (Next 16's middleware.ts → proxy.ts)
```

### Routes that already have a layout (build pages inside them)

| Path             | Layout file                          | Guard                 |
| ----------------- | ------------------------------------- | ---------------------- |
| `(marketing)/*`   | `src/app/(marketing)/layout.tsx`      | none (public)           |
| `(auth)/*`        | `src/app/(auth)/layout.tsx`           | none (redirects if already authed — add that check in each page if needed) |
| `admin/*`         | `src/app/admin/layout.tsx`            | `<RequireStaff>` + `proxy.ts` |
| `portal/*`        | `src/app/portal/layout.tsx`           | `<RequireCandidate>` + `proxy.ts` |

Only `(marketing)/page.tsx` and `design-system/page.tsx` exist today — every other
page (`/services/[slug]`, `/careers`, `/blog/[slug]`, `/admin/jobs`, `/portal/profile`,
`/login`, etc.) still needs to be created by the marketing/portal/admin agents.
`config/nav.ts` already lists every intended route (`marketingNav`, `portalNav`,
`adminNav`) — that list is the route map.

## Fetching data

**Server (RSC, `generateMetadata`, route handlers) — always this, never the browser client:**

```ts
import { getServices } from '@/lib/api/public'; // or fetchData/fetchList from '@/lib/api/server' for anything not already wrapped
const services = await getServices(); // never throws — falls back to @kmg/shared content if the API is down
```

`serverFetch`/`fetchData`/`fetchList` in `src/lib/api/server.ts` are the low-level
primitives (ISR `revalidate`, `tags` for `revalidateTag()`, 3s timeout, resolve to
`null`/`emptyPage()` on any failure — pages must always render even if the API is
unreachable). `src/lib/api/public.ts` wraps them per-resource with typed
`FALLBACK_*` constants seeded from `@kmg/shared`.

**Client (interactive pages, admin/portal dashboards) — TanStack Query + the browser client:**

```ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';

const { data, isLoading, error } = useQuery({
  queryKey: qk.admin.jobs.list(params),
  queryFn: () => api.getList<Job>('/admin/jobs', { query: params }),
});
```

`api.get/post/patch/put/delete` return the raw response; `api.getData/postData/patchData/putData`
unwrap the `{ data }` envelope; `api.getList` returns `{ data, meta }` as-is;
`api.upload(path, formData, { onProgress })` is for `multipart/form-data`. Every
query key lives in `qk` (`src/lib/api/query-keys.ts`) — add new resources there,
don't inline key arrays.

`src/lib/api/client.ts` implements the refresh flow from `docs/API_CONTRACT.md`
exactly: access token in memory only (`tokenStore`), a 401 triggers
`refreshAccessToken()` (module-level `refreshPromise` singleton — concurrent
callers share one in-flight `/auth/refresh` call), the original request is retried
**once** after a successful refresh, and a failed refresh fires `emitAuthLogout()`
(`AuthProvider` listens and clears the session). `/auth/refresh` and `/auth/logout`
skip this dance and always send the CSRF header. `ApiError` exposes
`.status`, `.fieldErrors` (path → message, ready for `form.setError`), and the
`.isUnauthorized/.isForbidden/.isNotFound/.isValidation` helpers; use `errorMessage(error)`
for a display string and `isApiError(error)` as a type guard.

## Building forms

```tsx
'use client';
import { loginSchema, type LoginInput } from '@kmg/shared';
import { Form, TextField, SubmitButton, useZodForm, applyApiErrorToForm } from '@/components/forms';
import { useAuth } from '@/lib/auth/auth-provider';
import { toast } from 'sonner';

const form = useZodForm(loginSchema, { defaultValues: { email: '', password: '' } });
const { login } = useAuth();

async function onSubmit(values: LoginInput) {
  try {
    await login(values);
  } catch (error) {
    toast.error(applyApiErrorToForm(error, form));
  }
}

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
    <TextField name="email" label="Work email" type="email" required />
    <TextField name="password" label="Password" type="password" required />
    <SubmitButton>Sign in</SubmitButton>
  </form>
</Form>
```

Everything comes from `@/components/forms`: `TextField`, `TextareaField`,
`SelectField`, `CheckboxField`, `RadioField`, `SwitchField`, `SubmitButton`,
`RichTextEditor` (TipTap, for blog/job descriptions), `TagInput`/`ListInput`
(chips for `string[]`), `useZodForm` (wraps `react-hook-form` + `zodResolver`
around a schema from `@kmg/shared`), and `applyApiErrorToForm` (maps
`ApiError.fieldErrors` onto the form, returns the leftover message for a toast).
File uploads use `<FileDropzone purpose="resume" value={file} onChange={setFile} progress={pct} />`
from `@/components/shared` together with `api.upload`.

## Shared UI composites (`@/components/shared`)

- `PageHeader` — title/description/breadcrumbs/actions block for admin & portal pages.
- `DataTable` — TanStack Table wrapper: sorting (`parseSort`/`serializeSort` ⇄ `"field:dir"`),
  column visibility, row selection, built-in search box, pagination from `PaginationMeta`,
  renders `TableSkeleton` while loading and `EmptyState` when empty.
- `StatusBadge` — `<StatusBadge kind="application" status={application.status} />`; kinds:
  `application | job | lead | interview | post | decision`. `resolveStatus(kind, status)`
  exposes the same `{ label, tone }` mapping for charts/filters.
- `StatCard` — KPI tile (`label`, `value`, `icon`, `delta`, `tone: 'brand' | 'ember' | 'neutral'`).
- `EmptyState` / `EmptyStateWithAction`, `ErrorState`, `SuccessState` — the three
  standard non-happy-path states; `ErrorState` takes a raw `error` and formats it via `errorMessage`.
- `CardSkeleton`/`CardGridSkeleton`/`ListSkeleton`/`TableSkeleton`/`StatsSkeleton`/`FormSkeleton`/`DetailSkeleton`/`FullPageLoader` — loading placeholders (`FullPageLoader` is what `app/loading.tsx` renders).
- `ConfirmDialog` — promise-friendly destructive-action confirmation.
- `FileDropzone` — drag/drop + validation against `UPLOAD_RULES` from `@kmg/shared`.
- `GlobalSearchProvider`/`GlobalSearchTrigger`/`useGlobalSearch` — the ⌘K command palette (mounted once in `Providers`).
- `RichText` — styled container for server-sanitized HTML (blog/job/case-study bodies).
- `TechLogo` — simpleicons.org logo with an initials fallback.
- `ShareButtons`, `JsonLd`, `ThemeToggle`, `DynamicIcon`/`toIconName` (render a lucide icon by name string from data).

Import everything from the barrel: `import { DataTable, PageHeader, StatusBadge, EmptyState } from '@/components/shared';`

## Motion (`@/components/motion`)

`Reveal`/`FadeIn` (scroll/mount reveal), `Stagger`/`StaggerItem` (staggered children),
`Marquee` (auto-scrolling logo/tech strip), `AnimatedCounter` (count-up stat),
`FloatingIcons` (decorative hero background), `PageTransition` (route change fade).
All respect `prefers-reduced-motion`. Import from the barrel: `@/components/motion`.

## Auth & permissions

```tsx
'use client';
import { RequireAuth, Can, useCan } from '@/lib/auth';
import { useAuth } from '@/lib/auth/auth-provider';

<RequireAuth permission="jobs:write">…</RequireAuth>   // roles?/permission? — redirects to /login?next=… when unauthenticated, renders ErrorState when forbidden
<RequireStaff>{children}</RequireStaff>                 // any STAFF_ROLES — used by admin/layout.tsx already
<RequireCandidate>{children}</RequireCandidate>         // any signed-in user — used by portal/layout.tsx already

<Can permission="jobs:write"><Button>New job</Button></Can>   // conditional render, no redirect
const canEdit = useCan('jobs:write');                          // imperative check

const { user, isAuthenticated, isStaff, hasPermission, hasRole, login, register, logout } = useAuth();
```

`proxy.ts` (project root's `src/proxy.ts` — Next 16 renamed `middleware.ts` →
`proxy.ts`) only checks the cheap, non-secret `kmg_session` hint cookie and
redirects to `/login?next=<path>` before the page even renders; the real
role/permission check happens client-side in the guards above once the access
token is restored from the httpOnly refresh cookie. Don't duplicate the
protected-prefix list — it's `['/portal', '/admin']` in `proxy.ts` only.

## SEO

```ts
export const metadata: Metadata = buildMetadata({
  title: 'Careers',
  description: '…',
  path: '/careers',
  // noIndex: true, type: 'article', keywords: [...], publishedTime, modifiedTime, authors
});
```

`buildMetadata()` (`@/lib/seo`) sets the canonical URL, OpenGraph and Twitter
cards. JSON-LD builders — `organizationJsonLd`, `webSiteJsonLd`,
`breadcrumbJsonLd`, `serviceJsonLd`, `articleJsonLd`, `jobPostingJsonLd`,
`caseStudyJsonLd`, `faqJsonLd` — feed `<JsonLd data={[...]} />` from
`@/components/shared`. The root layout already emits `organizationJsonLd()` +
`webSiteJsonLd()`; add page-specific JSON-LD (breadcrumbs, a `JobPosting`, an
`Article`, …) directly in that page. Route-specific OG images can override
`opengraph-image.tsx` by exporting their own `opengraph-image.tsx`/`.png` inside
that route segment — the root one is only the site-wide fallback.

## Design rules

- **Color**: three token families in `globals.css` — `brand-*` (logo orange,
  `--brand-500: #F39C2C`) for primary CTAs/highlights/active states, `ember-*`
  (red, `--ember-500: #E5312F`) for destructive actions and genuinely urgent
  states only, `ink-*` for neutrals/surfaces/text. Never use raw hex — use the
  Tailwind classes (`bg-brand-500`, `text-ember-600`, …) or the shadcn
  semantic tokens (`bg-primary`, `bg-destructive`, `bg-muted`, `bg-accent`,
  `text-muted-foreground`) so dark mode (`.dark` class via `next-themes`)
  resolves automatically. `.gradient-text` / `variant="gradient"` on `Button`
  is the brand→ember gradient, reserved for the primary hero CTA.
- **Typography**: `font-sans` (Inter, body), `font-display` (Plus Jakarta Sans,
  all headings — always pair with `tracking-tight`), `font-mono` (JetBrains
  Mono, code/IDs). Scale: `text-4xl`/`text-2xl`/`text-lg` display headings,
  `text-base` body, `text-sm text-muted-foreground` secondary copy.
- **Spacing**: use the `Container` (max-width + gutters) and `Section`
  (`eyebrow`/`title`/`description`/`action` + consistent vertical rhythm,
  `variant="dark"` for contrast bands) layout components for marketing pages
  instead of hand-rolled padding; admin/portal pages use `PageHeader` +
  `p-4 md:p-6 lg:p-8` (already applied by the layouts).
- Every visual primitive should work in both themes — check `/design-system`
  with the theme toggle before shipping a new component.

## Tooling

- `pnpm --filter @kmg/web dev|build|start|typecheck|lint|test`
- Lint: flat config in `eslint.config.mjs` (`eslint-config-next` — core-web-vitals
  + typescript). `react-hooks/set-state-in-effect` (from the new React Compiler
  readiness rules in `eslint-plugin-react-hooks` v6) is downgraded to a warning
  project-wide — it fires on several correct, React-docs-endorsed "sync from an
  external system" effects (SSR-safe mount flags, `matchMedia`/resize listeners,
  session restore) and this app doesn't enable the React Compiler.
- Tests: `vitest.config.ts` + `vitest.setup.ts` (jsdom, `@testing-library/jest-dom`,
  `ResizeObserver`/`matchMedia` stubs). `src/lib/utils.test.ts` is a smoke test —
  copy its shape for new unit tests (`src/**/*.test.ts(x)`, colocated with the code).
- The production build must succeed with the API offline — every server data
  function degrades to `null`/`emptyPage()`/`@kmg/shared` fallback content by
  design; don't add a fetch that throws on failure.
