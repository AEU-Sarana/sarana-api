.PHONY: help up down build rebuild fresh restart logs ps status shell app-logs nginx-logs db-logs redis-logs migrate seed health clean

# ==============================
# Environment (dev | prod)
# ==============================
ENV ?= dev

COMPOSE_BASE := docker-compose.yml
COMPOSE_OVERRIDE := docker-compose.$(ENV).yml

DOCKER_COMPOSE := $(shell command -v docker-compose 2>/dev/null || echo "docker compose")
COMPOSE_CMD := $(DOCKER_COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_OVERRIDE)

# ==============================
# Help
# ==============================
help:
	@echo "Stock POS Server - Docker Makefile"
	@echo ""
	@echo "Environment: $(ENV)"
	@echo ""
	@echo "Core commands:"
	@echo "  make up             Start containers"
	@echo "  make down           Stop containers"
	@echo "  make restart        Restart containers"
	@echo "  make build          Build images"
	@echo "  make rebuild        Build images (no cache)"
	@echo "  make fresh          Full reset (down -v, build, up)"
	@echo ""
	@echo "Logs & status:"
	@echo "  make ps             Container status"
	@echo "  make logs           All logs"
	@echo "  make app-logs       App logs"
	@echo "  make nginx-logs     Nginx logs"
	@echo "  make db-logs        Postgres logs"
	@echo "  make redis-logs     Redis logs"
	@echo ""
	@echo "App commands:"
	@echo "  make shell          App shell"
	@echo "  make migrate        Run DB migrations"
	@echo "  make seed           Seed database"
	@echo ""
	@echo "Examples:"
	@echo "  make up ENV=dev"
	@echo "  make up ENV=prod"

# ==============================
# Lifecycle
# ==============================
up:
	$(COMPOSE_CMD) up -d

down:
	$(COMPOSE_CMD) down

restart: down up

build:
	$(COMPOSE_CMD) build

rebuild:
	$(COMPOSE_CMD) build --no-cache

fresh:
	$(COMPOSE_CMD) down -v
	$(COMPOSE_CMD) build --no-cache
	$(COMPOSE_CMD) up -d

# ==============================
# Status & Logs
# ==============================
ps:
	$(COMPOSE_CMD) ps

status: ps

logs:
	$(COMPOSE_CMD) logs -f

app-logs:
	$(COMPOSE_CMD) logs -f app-dev

nginx-logs:
	$(COMPOSE_CMD) logs -f nginx

db-logs:
	$(COMPOSE_CMD) logs -f db

redis-logs:
	$(COMPOSE_CMD) logs -f redis

# ==============================
# App / DB
# ==============================
shell:
	$(COMPOSE_CMD) exec app-dev sh

migrate:
	$(COMPOSE_CMD) exec app-dev pnpm db:migrate:deploy

seed:
	$(COMPOSE_CMD) exec app-dev pnpm db:seed

# ==============================
# Health & Cleanup
# ==============================
health:
	$(COMPOSE_CMD) ps
	@echo "--- API ---"
	@curl -s http://localhost/health || echo "API not reachable"

clean:
	@docker system prune -f
