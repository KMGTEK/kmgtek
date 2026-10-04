# Kubernetes manifests (Kustomize)

```
infra/k8s/
├── base/                 # namespace-less base: api, web, migration Job, Ingress, NetworkPolicies
│   ├── config.env        # -> ConfigMap `kmg-config` (content-hashed, rolls pods on change)
│   ├── secret.example.yaml       # template only — use External Secrets / Sealed Secrets
│   ├── seed-job.example.yaml     # one-off seeding of a fresh database
│   └── servicemonitor.example.yaml
├── overlays/staging/     # namespace kmg-staging, 2 replicas, staging.kmgtek.com, LE staging issuer
├── overlays/production/  # namespace kmg-production, 3 replicas + HPA to 20, kmgtek.com
├── addons/               # dev-only Postgres/Redis/MinIO/Mailpit (never in production)
└── cluster/              # cert-manager ClusterIssuers (applied once by an admin)
```

Render without applying:

```bash
kubectl kustomize infra/k8s/overlays/production      # or: kustomize build …
```

Deploy (see docs/DEPLOYMENT.md for the full procedure):

```bash
kubectl -n kmg-production delete job api-migrate --ignore-not-found
kubectl apply -k infra/k8s/overlays/production --selector kmg.io/deploy-phase=pre
kubectl -n kmg-production wait --for=condition=complete job/api-migrate --timeout=10m
kubectl apply -k infra/k8s/overlays/production
kubectl -n kmg-production rollout status deploy/api deploy/web
```
