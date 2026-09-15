# Mini Kanban — developer commands
#
# Run `make` or `make help` to list the available targets.

SHELL := /bin/sh

BACKEND_DIR := backend
FRONTEND_DIR := frontend
API_PORT ?= 8000

.PHONY: help install dev dev-backend dev-frontend test test-backend test-frontend \
        lint typecheck build check clean

help: ## Show this help
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install backend and frontend dependencies
	cd $(BACKEND_DIR) && uv sync
	cd $(FRONTEND_DIR) && npm install

dev: ## Run backend and frontend together (Ctrl-C stops both)
	@echo "Backend  → http://127.0.0.1:$(API_PORT)"
	@echo "Frontend → http://localhost:5173"
	@( cd $(BACKEND_DIR) && uv run uvicorn app.main:app --reload --port $(API_PORT) ) & \
	backend_pid=$$!; \
	( cd $(FRONTEND_DIR) && npm run dev ) & \
	frontend_pid=$$!; \
	trap 'kill $$backend_pid $$frontend_pid 2>/dev/null' INT TERM EXIT; \
	wait

dev-backend: ## Run the FastAPI dev server with reload
	cd $(BACKEND_DIR) && uv run uvicorn app.main:app --reload --port $(API_PORT)

dev-frontend: ## Run the Vite dev server
	cd $(FRONTEND_DIR) && npm run dev

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests (pytest)
	cd $(BACKEND_DIR) && uv run pytest

test-frontend: ## Run frontend tests (vitest)
	cd $(FRONTEND_DIR) && npx vitest run

lint: ## Lint the frontend (oxlint)
	cd $(FRONTEND_DIR) && npm run lint

typecheck: ## Type-check the frontend (tsc)
	cd $(FRONTEND_DIR) && npx tsc -b

build: ## Build the frontend for production
	cd $(FRONTEND_DIR) && npm run build

check: lint typecheck test ## Lint, type-check, and test everything

clean: ## Remove build output and caches
	rm -rf $(FRONTEND_DIR)/dist
	find $(BACKEND_DIR) -type d \( -name __pycache__ -o -name .pytest_cache \) -prune -exec rm -rf {} +
