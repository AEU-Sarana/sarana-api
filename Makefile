.PHONY: help up down build rebuild fresh restart logs ps status shell app-logs nginx-logs db-logs redis-logs migrate seed health clean up-dev up-staging up-prod down-dev down-staging down-prod build-dev build-staging build-prod rebuild-dev rebuild-staging rebuild-prod

# ==============================
# Environment (dev | staging | prod)
# ==============================
ENV ?= dev

COMPOSE_BASE := docker-compose.yml
DOCKER_COMPOSE := $(shell command -v docker-compose 2>/dev/null || echo "docker compose")

# Helper function to get compose command
ifeq ($(ENV),dev)
	COMPOSE_CMD := $(DOCKER_COMPOSE) -f $(COMPOSE_BASE) -f docker-compose.dev.yml --profile dev
	APP_SERVICE := app
else ifeq ($(ENV),staging)
	COMPOSE_CMD := $(DOCKER_COMPOSE) -f $(COMPOSE_BASE) -f docker-compose.staging.yml
	APP_SERVICE := app
else ifeq ($(ENV),prod)
	COMPOSE_CMD := $(DOCKER_COMPOSE) -f $(COMPOSE_BASE) -f docker-compose.prod.yml
	APP_SERVICE := app
else
	COMPOSE_CMD := $(DOCKER_COMPOSE) -f $(COMPOSE_BASE) -f docker-compose.$(ENV).yml
	APP_SERVICE := app
endif

# ==============================
# Help
# ==============================
help:
	@echo "Stock POS Server - Docker Makefile"
	@echo ""
	@echo "Available environments: dev, staging, prod"
	@echo "Current environment: $(ENV)"
	@echo ""
	@echo "Core commands:"
	@echo "  make up             Start containers (current ENV)"
	@echo "  make down           Stop containers (current ENV)"
	@echo "  make restart        Restart containers (current ENV)"
	@echo "  make build          Build images (current ENV)"
	@echo "  make rebuild        Build images with no cache (current ENV)"
	@echo "  make fresh          Full reset: down -v, build, up (current ENV)"
	@echo ""
	@echo "Environment-specific commands:"
	@echo "  make up-dev          Start dev environment"
	@echo "  make up-staging      Start staging environment"
	@echo "  make up-prod         Start production environment"
	@echo "  make down-dev        Stop dev environment"
	@echo "  make down-staging    Stop staging environment"
	@echo "  make down-prod       Stop production environment"
	@echo "  make build-dev       Build dev images"
	@echo "  make build-staging   Build staging images"
	@echo "  make build-prod      Build production images"
	@echo "  make rebuild-dev     Rebuild dev images (no cache)"
	@echo "  make rebuild-staging Rebuild staging images (no cache)"
	@echo "  make rebuild-prod    Rebuild production images (no cache)"
	@echo ""
	@echo "Logs & status:"
	@echo "  make ps             Container status (current ENV)"
	@echo "  make logs           All logs (current ENV)"
	@echo "  make app-logs       App logs (current ENV)"
	@echo "  make nginx-logs      Nginx logs (current ENV)"
	@echo "  make db-logs         Postgres logs (current ENV)"
	@echo "  make redis-logs      Redis logs (current ENV)"
	@echo ""
	@echo "App commands:"
	@echo "  make shell           App shell (current ENV)"
	@echo "  make migrate          Run DB migrations (current ENV)"
	@echo "  make seed             Seed database (current ENV)"
	@echo ""
	@echo "Examples:"
	@echo "  make up ENV=dev"
	@echo "  make up ENV=staging"
	@echo "  make up ENV=prod"
	@echo "  make up-dev"
	@echo "  make up-prod"

# ==============================
# Lifecycle (using current ENV)
# ==============================
up:
	@echo "Starting $(ENV) environment..."
	@$(COMPOSE_CMD) down 2>/dev/null || true
	@if [ "$(ENV)" = "dev" ]; then \
		docker rm -f $$(docker ps -aq --filter "name=stock-pos") 2>/dev/null || true; \
		docker network rm stock-pos-server_stock-pos-network 2>/dev/null || true; \
	fi
	@$(COMPOSE_CMD) up -d

down:
	@echo "Stopping $(ENV) environment..."
	@$(COMPOSE_CMD) down

restart: down up

build:
	@echo "Building $(ENV) environment..."
	@$(COMPOSE_CMD) build

rebuild:
	@echo "Rebuilding $(ENV) environment (no cache)..."
	@$(COMPOSE_CMD) build --no-cache

fresh:
	@echo "Fresh start for $(ENV) environment..."
	@$(COMPOSE_CMD) down -v
	@$(COMPOSE_CMD) build --no-cache
	@$(COMPOSE_CMD) up -d

# ==============================
# Environment-specific commands
# ==============================
up-dev:
	@$(MAKE) up ENV=dev

up-staging:
	@$(MAKE) up ENV=staging

up-prod:
	@$(MAKE) up ENV=prod

down-dev:
	@$(MAKE) down ENV=dev

down-staging:
	@$(MAKE) down ENV=staging

down-prod:
	@$(MAKE) down ENV=prod

build-dev:
	@$(MAKE) build ENV=dev

build-staging:
	@$(MAKE) build ENV=staging

build-prod:
	@$(MAKE) build ENV=prod

rebuild-dev:
	@$(MAKE) rebuild ENV=dev

rebuild-staging:
	@$(MAKE) rebuild ENV=staging

rebuild-prod:
	@$(MAKE) rebuild ENV=prod

# ==============================
# Status & Logs
# ==============================
ps:
	@$(COMPOSE_CMD) ps

status: ps

logs:
	@$(COMPOSE_CMD) logs -f

app-logs:
	@$(COMPOSE_CMD) logs -f $(APP_SERVICE)

nginx-logs:
	@$(COMPOSE_CMD) logs -f nginx

db-logs:
	@$(COMPOSE_CMD) logs -f db

redis-logs:
	@$(COMPOSE_CMD) logs -f redis

# ==============================
# App / DB
# ==============================
shell:
	@$(COMPOSE_CMD) exec $(APP_SERVICE) sh

migrate:
	@$(COMPOSE_CMD) exec $(APP_SERVICE) pnpm db:migrate:deploy

seed:
	@$(COMPOSE_CMD) exec $(APP_SERVICE) pnpm seed

# ==============================
# Health & Cleanup
# ==============================
health:
	@$(COMPOSE_CMD) ps
	@echo "--- API ---"
	@if [ "$(ENV)" = "dev" ]; then \
		NGINX_PORT=$$(grep -E '^NGINX_HTTP_PORT=' .env 2>/dev/null | cut -d '=' -f2); \
		PORT=$${NGINX_PORT:-8088}; \
		curl -s http://localhost:$$PORT/health || echo "API not reachable"; \
	else \
		curl -s http://localhost/health || echo "API not reachable"; \
	fi

clean:
	@docker system prune -f
