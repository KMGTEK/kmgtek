# Deployment

Everything needed to run the KmgTechnologies platform outside a laptop: configuration,
Docker Compose, TLS, Kubernetes, backups, third-party setup and a go-live checklist.

- Images: `infra/docker/api.Dockerfile`, `infra/docker/web.Dockerfile` (build context = repo root)
- Compose: `docker-compose.yml` (full stack), `docker-compose.dev.yml` (backing services)
- Kubernetes: `infra/k8s/` (Kustomize base + `overlays/staging` + `overlays/production`)
- CI/CD: `.github/workflows/ci.yml`, `.github/workflows/release.yml`

---

## 1. Environment variables

Source of truth: [`.env.example`](../.env.example). `R` = required in production.

### API (`apps/api`)

| Variable                                        |  R  | Default                         | Description                                                                                 |
| ----------------------------------------------- | :-: | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                      |  ✓  | `development`                   | `production` in every deployed environment                                                  |
| `API_PORT`                                      |     | `4000`                          | Port the Nest server listens on                                                             |
| `WEB_URL`                                       |  ✓  | `http://localhost:3000`         | Public site origin — used in emails, OAuth redirects, password-reset links                  |
| `CORS_ORIGINS`                                  |  ✓  | `http://localhost:3000`         | Comma-separated browser origin allow-list (also used for CSRF origin checks)                |
| `DATABASE_URL`                                  |  ✓  | –                               | PostgreSQL URL. Append `?schema=public&connection_limit=10&pool_timeout=20&sslmode=require` |
| `JWT_ACCESS_SECRET`                             |  ✓  | –                               | HS256 signing key, ≥32 chars (`openssl rand -base64 48`)                                    |
| `JWT_ACCESS_TTL`                                |     | `15m`                           | Access-token lifetime                                                                       |
| `REFRESH_TOKEN_TTL_DAYS`                        |     | `30`                            | Refresh-cookie lifetime (rotated on every use)                                              |
| `COOKIE_SECURE`                                 |  ✓  | `false`                         | **`true` whenever the site is served over HTTPS**                                           |
| `COOKIE_DOMAIN`                                 |     | empty                           | Set only when sharing cookies across subdomains (e.g. `.kmgtek.com`)                        |
| `REDIS_URL`                                     |     | empty                           | Rate-limit/cache store. Required for correct limits with >1 replica                         |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`     |     | empty                           | Enables the Google login button                                                             |
| `GOOGLE_CALLBACK_URL`                           |     | localhost                       | `https://<site>/api/v1/auth/google/callback`                                                |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` |     | empty                           | Enables the LinkedIn login button                                                           |
| `LINKEDIN_CALLBACK_URL`                         |     | localhost                       | `https://<site>/api/v1/auth/linkedin/callback`                                              |
| `STORAGE_DRIVER`                                |  ✓  | `local`                         | `s3` in every deployed environment (`local` = single-node dev only)                         |
| `STORAGE_LOCAL_DIR`                             |     | `./uploads`                     | Only used by the `local` driver                                                             |
| `S3_ENDPOINT`                                   |  ✓  | MinIO                           | Empty/AWS endpoint for real S3, `http://minio:9000` in compose                              |
| `S3_REGION`                                     |  ✓  | `us-east-1`                     | Bucket region                                                                               |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY`               | ✓¹  | `minioadmin`                    | Omit when using IRSA / instance roles                                                       |
| `S3_BUCKET_PUBLIC`                              |  ✓  | `kmg-public`                    | Anonymous-read bucket (images, logos)                                                       |
| `S3_BUCKET_PRIVATE`                             |  ✓  | `kmg-private`                   | Résumés and cover letters — never public                                                    |
| `S3_FORCE_PATH_STYLE`                           |     | `true`                          | `true` for MinIO, `false` for AWS S3                                                        |
| `S3_PUBLIC_URL`                                 |  ✓  | MinIO URL                       | Public base URL (CDN domain) for objects in the public bucket                               |
| `SIGNED_URL_TTL_SECONDS`                        |     | `300`                           | Lifetime of signed URLs for private objects                                                 |
| `MAIL_DRIVER`                                   |  ✓  | `log`                           | `smtp` in deployed environments                                                             |
| `SMTP_HOST` / `SMTP_PORT`                       |  ✓  | `localhost` / `1025`            | Relay host and port (587 STARTTLS, 465 implicit TLS)                                        |
| `SMTP_SECURE`                                   |     | `false`                         | `true` only for port 465                                                                    |
| `SMTP_USER` / `SMTP_PASS`                       | ✓²  | empty                           | Relay credentials (SES SMTP credentials, Postmark token, …)                                 |
| `MAIL_FROM_NAME` / `MAIL_FROM_ADDRESS`          |  ✓  | KMG / recruiting@kmgtek.com     | Must be a verified sender                                                                   |
| `MAIL_NOTIFY_ADDRESSES`                         |  ✓  | recruiting@kmgtek.com           | Staff inbox for new leads/applications (comma-separated)                                    |
| `RATE_LIMIT_PER_MINUTE`                         |     | `120`                           | Global default per IP (per-endpoint limits are stricter)                                    |
| `LOG_LEVEL`                                     |     | `info`                          | `fatal…trace`                                                                               |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`      |     | admin@kmgtek.com / ChangeMe123! | Only read by the seed script                                                                |
| `SEED_DEMO_DATA`                                |     | `true`                          | **`false` in production**                                                                   |
| `RUN_MIGRATIONS`                                |     | `false`                         | Container-only: run `prisma migrate deploy` on start (compose sets `true`)                  |

¹ unless the pod assumes an IAM role. ² unless the relay allows unauthenticated submission from the VPC.

### Web (`apps/web`)

| Variable               |  R  | Default                 | Description                                                                                                                   |
| ---------------------- | :-: | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` |  ✓  | `http://localhost:3000` | Canonical origin (sitemap, OpenGraph, absolute URLs). **Inlined at build time**                                               |
| `NEXT_PUBLIC_GA_ID`    |     | empty                   | Google Analytics measurement id. **Inlined at build time**                                                                    |
| `API_INTERNAL_URL`     |  ✓  | `http://localhost:4000` | Where the Next server reaches the API (`http://api:4000` in-cluster). Used by rewrites (build time) and SSR fetches (runtime) |
| `PORT`                 |     | `3000`                  | Listen port                                                                                                                   |

> Because `NEXT_PUBLIC_*` values are baked into the client bundle, **a web image is environment-specific**.
> The release workflow therefore builds `kmg-web:<tag>` (production URL) and `kmg-web:<tag>-staging`.

---

## 2. Docker Compose (single host)

```bash
cp .env.example .env
# edit: NEXT_PUBLIC_SITE_URL, POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_ACCESS_SECRET,
#       S3_ACCESS_KEY/S3_SECRET_KEY, MAIL_*, COOKIE_SECURE
docker compose build
docker compose up -d
docker compose --profile seed run --rm seed     # first deploy only
docker compose ps
docker compose logs -f api
```

What starts: `postgres` → `redis` → `minio` (+ one-shot `minio-init` creating both buckets and the
anonymous-read policy) → `mailpit` → `api` (applies migrations via `RUN_MIGRATIONS=true`) → `web` →
`nginx` on :80/:443. Every dependency waits on a healthcheck.

Compose-only variables: `POSTGRES_USER/PASSWORD/DB`, `REDIS_PASSWORD`, `HTTP_PORT`, `HTTPS_PORT`,
`MINIO_PORT`, `MINIO_CONSOLE_PORT`, `MAILPIT_UI_PORT`, `IMAGE_REGISTRY`, `KMG_VERSION`.

**Object storage caveat.** A pre-signed URL is bound to the host it was signed for. Inside the
network the API signs against `http://minio:9000`, which a browser cannot resolve. For a real
single-host deployment either (a) point the API at real S3, or (b) give MinIO a DNS name that
resolves from both sides (`S3_ENDPOINT_INTERNAL=https://s3.kmgtek.com`) and proxy it. For local
experimentation, adding `127.0.0.1 minio` to `/etc/hosts` makes signed URLs work as-is.
Public assets have no such problem: set `S3_PUBLIC_URL=https://<domain>/media` and nginx serves the
public bucket from `/media/`.

### Updating

```bash
git pull
docker compose build api web
docker compose up -d          # api re-runs `prisma migrate deploy` before serving
```

### TLS

1. Issue certificates (certbot on the host, or copy them from your CA) and place
   `fullchain.pem` / `privkey.pem` / `chain.pem` in `infra/nginx/certs/`.
2. In `infra/nginx/conf.d/kmg.conf`: uncomment the `443` server block, and in the port-80 server
   replace the `include …/kmg-locations.conf;` with `return 301 https://$host$request_uri;`
   (keep the ACME challenge and `/nginx-health` locations).
3. Enable HSTS in `infra/nginx/snippets/security-headers.conf`.
4. Set `COOKIE_SECURE=true`, `NEXT_PUBLIC_SITE_URL=https://…`, `WEB_URL=https://…`,
   `CORS_ORIGINS=https://…`, then rebuild the web image (`NEXT_PUBLIC_*` is baked in) and
   `docker compose up -d`.
5. Renewal: `certbot renew --webroot -w /var/www/certbot && docker compose exec nginx nginx -s reload`.

---

## 3. Kubernetes

Prerequisites: a cluster with an **ingress-nginx** controller, **cert-manager**, a metrics server
(for the HPA) and a CNI that enforces NetworkPolicies. Managed PostgreSQL, Redis and S3.

```bash
# once per cluster
kubectl apply -f infra/k8s/cluster/cluster-issuer.yaml

# per environment
kubectl apply -f infra/k8s/overlays/production/namespace.yaml
# secrets — see §3.1 (External Secrets / Sealed Secrets preferred)
kubectl -n kmg-production apply -f my-secrets.yaml

kubectl kustomize infra/k8s/overlays/production | less    # review

kubectl -n kmg-production delete job api-migrate --ignore-not-found
kubectl apply -k infra/k8s/overlays/production --selector kmg.io/deploy-phase=pre
kubectl -n kmg-production wait --for=condition=complete job/api-migrate --timeout=10m
kubectl apply -k infra/k8s/overlays/production
kubectl -n kmg-production rollout status deploy/api deploy/web
```

`make k8s-staging` / `make k8s-prod` wrap exactly those steps, and the
`.github/actions/kustomize-deploy` composite action runs them in CI.

**First deployment only** — seed roles, permissions, email templates and the admin user:

```bash
kubectl -n kmg-production get cm | grep kmg-config      # note the hashed ConfigMap name
# edit infra/k8s/base/seed-job.example.yaml with that name, then:
kubectl -n kmg-production apply -f infra/k8s/base/seed-job.example.yaml
kubectl -n kmg-production wait --for=condition=complete job/api-seed --timeout=10m
```

### 3.1 Secrets

Never commit real values. In order of preference:

1. **External Secrets Operator** — an `ExternalSecret` syncs AWS Secrets Manager / Vault into the
   `kmg-secrets` Secret, with automatic rotation.
2. **Sealed Secrets** — `kubeseal --format yaml < secret.yaml > sealed-secret.yaml`, commit the sealed file.
3. `kubectl create secret generic kmg-secrets --from-literal=…` as a stop-gap.

The expected keys are listed in [`infra/k8s/base/secret.example.yaml`](../infra/k8s/base/secret.example.yaml).
Non-secret configuration lives in `base/config.env` + the overlay's `config.env`; kustomize
content-hashes the generated ConfigMap, so a config change automatically rolls the pods.

### 3.2 Migrations, rollout and rollback

- Migrations run **once**, in the `api-migrate` Job, before any new pod starts (`RUN_MIGRATIONS=false`
  in the Deployment). With Argo CD the same Job is a `PreSync` hook.
- Job specs are immutable — always `kubectl delete job api-migrate` before re-applying.
- Rollouts are `maxUnavailable: 0 / maxSurge: 1` with readiness on `/health/ready`, so traffic only
  shifts to healthy pods; PDBs keep 2 replicas available during node drains.

```bash
kubectl -n kmg-production rollout undo deploy/api        # previous ReplicaSet
kubectl -n kmg-production rollout history deploy/api
```

Because a rollback does **not** revert the database, write migrations that are backwards compatible
with the previous release (expand → migrate → contract: add nullable columns first, drop them a
release later). To undo a destructive migration you need `prisma migrate resolve` plus a restore.

### 3.3 Managed services

| Component      | Production choice          | Notes                                                                                                                        |
| -------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL     | RDS / Aurora PostgreSQL 16 | Multi-AZ, automated backups + PITR, TLS (`sslmode=require`), PgBouncer or RDS Proxy once replicas × pool > `max_connections` |
| Redis          | ElastiCache (Valkey/Redis) | TLS (`rediss://`), AUTH token, single-node is fine for throttling                                                            |
| Object storage | S3 + CloudFront            | Versioning on, block public access on `kmg-private`, bucket policy (not ACLs) for `kmg-public`, SSE-KMS                      |
| Email          | SES / Postmark / SendGrid  | Verified domain, SPF + DKIM + DMARC                                                                                          |

The manifests in `infra/k8s/addons/` (Postgres/Redis/MinIO/Mailpit) are for throwaway environments
only and are deliberately excluded from the production overlay.

---

## 4. Backups & disaster recovery

| Asset              | Mechanism                                                                                  | Target                  |
| ------------------ | ------------------------------------------------------------------------------------------ | ----------------------- |
| PostgreSQL         | Managed automated snapshots + PITR (retain ≥14 days); or a nightly `pg_dump` CronJob to S3 | RPO ≤ 15 min, RTO ≤ 1 h |
| Object storage     | Bucket versioning + lifecycle rules; cross-region replication for `kmg-private`            | RPO ≈ 0                 |
| Secrets            | Secrets Manager / Vault versioning                                                         | –                       |
| Manifests & config | This git repository                                                                        | –                       |

Self-managed dump (compose host) — schedule via cron:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" \
  | gzip > "backup-$(date +%F).dump.gz"
# restore
gunzip -c backup-2026-01-31.dump.gz \
  | docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
```

Restore drills belong on the calendar: a backup nobody has restored is a hypothesis. Verify after a
restore that `prisma migrate status` reports no pending migrations.

---

## 5. Third-party setup

### Google OAuth

1. Google Cloud Console → _APIs & Services_ → _OAuth consent screen_ (External), add the
   `email`, `profile`, `openid` scopes and your support/privacy URLs.
2. _Credentials_ → _Create OAuth client ID_ → Web application.
3. Authorised JavaScript origins: `https://kmgtek.com` (plus `http://localhost:3000` for dev).
4. Authorised redirect URIs — must match `GOOGLE_CALLBACK_URL` exactly:
   - `https://kmgtek.com/api/v1/auth/google/callback`
   - `https://staging.kmgtek.com/api/v1/auth/google/callback`
   - `http://localhost:3000/api/v1/auth/google/callback`
5. Put the client id/secret in the environment; the login button appears automatically.

### LinkedIn OAuth

1. <https://www.linkedin.com/developers/apps> → create an app, verify the company page.
2. Products → request **Sign In with LinkedIn using OpenID Connect**.
3. Auth tab → redirect URLs: `https://kmgtek.com/api/v1/auth/linkedin/callback` (+ staging/localhost).
4. Scopes: `openid`, `profile`, `email`.

### SMTP

- **SES**: verify the domain, add SPF/DKIM/DMARC DNS records, request production access (leave the
  sandbox), create SMTP credentials → `SMTP_HOST=email-smtp.<region>.amazonaws.com`, `SMTP_PORT=587`,
  `SMTP_SECURE=false`.
- **Postmark/SendGrid**: create a server/API token, use it as `SMTP_PASS`.
- `MAIL_FROM_ADDRESS` must be a verified sender, otherwise every notification bounces.
- Locally, Mailpit accepts everything and shows it at <http://localhost:8025>.

### CI/CD prerequisites (GitHub)

| Kind        | Name                                      | Purpose                                        |
| ----------- | ----------------------------------------- | ---------------------------------------------- |
| Secret      | `KUBE_CONFIG`                             | kubeconfig (raw or base64) for the deploy jobs |
| Variable    | `PRODUCTION_SITE_URL`, `STAGING_SITE_URL` | Baked into the web images                      |
| Variable    | `GA_ID`                                   | Optional analytics id                          |
| Environment | `staging`, `production`                   | Add required reviewers to `production`         |

Images are pushed to `ghcr.io/<owner>/kmg-api`, `kmg-api-tools` and `kmg-web` using the built-in
`GITHUB_TOKEN` (`packages: write`), then scanned with Trivy (SARIF uploaded to code scanning).

---

## 6. Production checklist

**Secrets & auth**

- [ ] `JWT_ACCESS_SECRET` generated with `openssl rand -base64 48`, stored in a secret manager, rotation scheduled
- [ ] Database, Redis, S3 and SMTP credentials unique per environment; no `.env` file in git
- [ ] `SEED_ADMIN_PASSWORD` changed after the first login; demo accounts absent (`SEED_DEMO_DATA=false`)
- [ ] Every staff account on MFA at the identity provider (when SSO is in front)

**Transport & cookies**

- [ ] HTTPS everywhere, HTTP redirects to HTTPS, HSTS enabled
- [ ] `COOKIE_SECURE=true`, `CORS_ORIGINS` lists only real origins, `WEB_URL`/`NEXT_PUBLIC_SITE_URL` are the canonical https URLs
- [ ] Certificates auto-renew (cert-manager or certbot timer) and expiry is monitored

**Data**

- [ ] Automated backups verified by an actual restore
- [ ] `kmg-private` blocks public access; `kmg-public` is read-only anonymous
- [ ] Migrations applied by the Job/entrypoint, `prisma migrate status` clean

**Runtime**

- [ ] `NODE_ENV=production`, `STORAGE_DRIVER=s3`, `MAIL_DRIVER=smtp`, `REDIS_URL` set
- [ ] ≥3 replicas of api and web, HPA + PDB active, resource requests tuned to observed usage
- [ ] Probes green; a rolling deploy causes no 5xx (watch the nginx JSON log)
- [ ] Log aggregation receiving `requestId`-tagged JSON; alerts on 5xx rate, p95 latency, restart loops

**Quality gates**

- [ ] CI green: lint, typecheck, unit, API e2e, web build, image builds
- [ ] Trivy reports no unfixed CRITICAL vulnerabilities
- [ ] Lighthouse ≥90 on performance/SEO/accessibility for `/`, `/services`, `/careers`, a job detail and a blog post
- [ ] `robots.txt` and `sitemap.xml` correct for the environment (staging must be `noindex`)
- [ ] Swagger (`/api/docs`) intentionally public or restricted
