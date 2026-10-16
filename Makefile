.DEFAULT_GOAL := help
.PHONY: help install check lint fmt test test-e2e build api-types api-types-check

help: ## Show this help
	@grep -hE '^[a-z][a-zA-Z0-9_-]*:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pnpm install --frozen-lockfile

check: ## svelte-check across the app and packages
	pnpm --filter @coin-book/web check

lint: ## Prettier in check mode
	pnpm exec prettier --check "apps/web/src/**/*.{ts,svelte}" "packages/*/src/**/*.{ts,svelte}"

fmt: ## Format everything
	pnpm exec prettier --write "apps/web/src/**/*.{ts,svelte}" "packages/*/src/**/*.{ts,svelte}"

test: ## Unit tests (packages/core) including the money vectors shared with the API
	pnpm --filter @coin-book/core test

test-e2e: ## Playwright against the demo stack (COINBOOK_SEED_DEMO=true make up in coin-book-local)
	pnpm --filter @coin-book/web test:e2e

build: ## Static build into apps/web/build, served by Caddy in coin-book-local
	pnpm --filter @coin-book/web build

api-types: ## Regenerate packages/core/src/api-types.ts from ../coin-book-api/openapi.yaml
	pnpm api-types

api-types-check: ## Fail when api-types.ts or the money vectors drifted from the API
	@pnpm api-types >/dev/null && git diff --exit-code packages/core/src/api-types.ts
	@diff -q ../coin-book-api/testdata/format-vectors.json packages/core/src/format-vectors.json
