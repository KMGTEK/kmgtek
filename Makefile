# KmgTechnologies platform — common operations.
# `make help` lists every target.

SHELL       := /bin/bash
.DEFAULT_GOAL := help

COMPOSE     ?= docker compose
DEV_COMPOSE := $(COMPOSE) -f docker-compose.dev.yml
REGISTRY    ?= ghcr.io/kmg-technologies
VERSION     ?= $(shell node -p "require('./package.json').version" 2>/dev/null || echo 0.0.0)
REVISION    ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo local)
K8S_STAGING := infra/k8s/overlays/staging
K8S_PROD    := infra/k8s/overlays/production

.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_.-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ───────────────────────────── local development ────────────────────────────
.PHONY: install
install: ## Install workspace dependencies and build @kmg/shared
	pnpm install
	pnpm --filter "@kmg/shared" build

.PHONY: dev
dev: dev-up ## Start backing services and run api + web with hot reload
	pnpm dev

.PHONY: dev-up
dev-up: ## Start postgres, redis, minio and mailpit for local development
	$(DEV_COMPOSE) up -d
	@echo "postgres :5432 · redis :6379 · minio :9000 (console :9001) · mailpit :8025"

.PHONY: dev-down
dev-down: ## Stop the local backing services
	$(DEV_COMPOSE) down

.PHONY: dev-reset
dev-reset: ## Destroy local data volumes and start clean (DESTRUCTIVE)
	$(DEV_COMPOSE) down -v
	$(DEV_COMPOSE) up -d

.PHONY: migrate
migrate: ## Create/apply Prisma migrations against the local database
	pnpm db:migrate

.PHONY: migrate-deploy
migrate-deploy: ## Apply committed migrations without generating new ones
	pnpm --filter "@kmg/api" exec prisma migrate deploy

.PHONY: seed
seed: ## Seed roles, settings, admin user and demo content
	pnpm db:seed

.PHONY: studio
studio: ## Open Prisma Studio
	pnpm db:studio

.PHONY: lint test typecheck build format
lint: ## Lint every workspace package
	pnpm lint
typecheck: ## Typecheck every workspace package
	pnpm typecheck
test: ## Run unit tests
	pnpm test
build: ## Build shared, api and web
	pnpm build
format: ## Prettier --write
	pnpm format

# ───────────────────────────── full stack (compose) ─────────────────────────
.PHONY: up
up: ## Build and start the whole stack behind nginx (http://localhost)
	$(COMPOSE) up -d --build
	@echo "site http://localhost · swagger http://localhost/api/docs · mailpit http://localhost:8025"

.PHONY: down
down: ## Stop the full stack
	$(COMPOSE) down

.PHONY: down-volumes
down-volumes: ## Stop the full stack and delete its volumes (DESTRUCTIVE)
	$(COMPOSE) down -v

.PHONY: compose-seed
compose-seed: ## Run the one-shot seed job against the compose stack
	$(COMPOSE) --profile seed run --rm seed

.PHONY: logs
logs: ## Tail logs of the full stack (make logs SERVICE=api)
	$(COMPOSE) logs -f --tail=200 $(SERVICE)

.PHONY: ps
ps: ## Show compose service status
	$(COMPOSE) ps

# ───────────────────────────── container images ─────────────────────────────
.PHONY: build-images
build-images: ## Build both production images locally
	docker build -f infra/docker/api.Dockerfile -t $(REGISTRY)/kmg-api:$(VERSION) \
	  --build-arg VERSION=$(VERSION) --build-arg REVISION=$(REVISION) .
	docker build -f infra/docker/web.Dockerfile -t $(REGISTRY)/kmg-web:$(VERSION) \
	  --build-arg VERSION=$(VERSION) --build-arg REVISION=$(REVISION) \
	  --build-arg NEXT_PUBLIC_SITE_URL=$${NEXT_PUBLIC_SITE_URL:-http://localhost:3000} .

.PHONY: push-images
push-images: ## Push both images to the registry
	docker push $(REGISTRY)/kmg-api:$(VERSION)
	docker push $(REGISTRY)/kmg-web:$(VERSION)

# ───────────────────────────── kubernetes ───────────────────────────────────
.PHONY: k8s-render
k8s-render: ## Render both overlays to stdout (no cluster needed)
	kubectl kustomize $(K8S_STAGING)
	kubectl kustomize $(K8S_PROD)

.PHONY: k8s-staging
k8s-staging: ## Deploy to the staging cluster (migrations first)
	kubectl -n kmg-staging delete job api-migrate --ignore-not-found
	kubectl apply -k $(K8S_STAGING) --selector kmg.io/deploy-phase=pre
	kubectl -n kmg-staging wait --for=condition=complete job/api-migrate --timeout=10m
	kubectl apply -k $(K8S_STAGING)
	kubectl -n kmg-staging rollout status deploy/api deploy/web

.PHONY: k8s-prod
k8s-prod: ## Deploy to the production cluster (migrations first)
	kubectl -n kmg-production delete job api-migrate --ignore-not-found
	kubectl apply -k $(K8S_PROD) --selector kmg.io/deploy-phase=pre
	kubectl -n kmg-production wait --for=condition=complete job/api-migrate --timeout=10m
	kubectl apply -k $(K8S_PROD)
	kubectl -n kmg-production rollout status deploy/api deploy/web

.PHONY: k8s-rollback
k8s-rollback: ## Roll back the last production rollout
	kubectl -n kmg-production rollout undo deploy/api
	kubectl -n kmg-production rollout undo deploy/web

.PHONY: k8s-logs
k8s-logs: ## Tail production API logs (make k8s-logs NS=kmg-staging APP=web)
	kubectl -n $${NS:-kmg-production} logs -l app.kubernetes.io/name=$${APP:-api} --tail=200 -f
