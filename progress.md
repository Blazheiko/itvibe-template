# Session Progress Log

## Current State

**Last Updated:** 2026-10-21
**Active Feature:** feat-006 - Env Example Sync (in_progress)
**Branch:** `feat/env-example-sync`

Scope (items from [docs/plan/code-issues-found-during-docs.md](docs/plan/code-issues-found-during-docs.md)): 4, 5, 6, 8, 31. Start PR: #25.

## Status

### What's Done

- [x] Items 4 and 31 — `SERVE_STATIC=false` in `.env.example`, missing `./public` only warns, Docker image sets `SERVE_STATIC=true` and `APP_ENV=production` (PR #24, merged)
- [x] Item 5 — `PGSQL_PORT` falls back to 5432; invalid values throw on start
- [x] Item 8 — one `resolveDatabaseConfig()` in `src/config/database.ts` for the app, `db:create` and drizzle-kit
- [x] Item 6 — `.env.example` synced with the variables the code reads

### Next

- [ ] Review and merge the items 5/6/8 PR, then flip feat-006 to `done` in `feature_list.json` via PR to `main`

## Files Modified (items 5, 6, 8)

- `packages/backend/src/config/database.ts` — `DATABASE_DEFAULTS`, `resolveDatabaseConfig()`, port validation; `database.spec.ts` (new)
- `packages/backend/src/db/create-database.ts` — uses `resolveDatabaseConfig()`
- `packages/backend/drizzle.config.js` → `drizzle.config.ts` — imports `./src/config/database.ts`
- `Dockerfile` — copies `drizzle.config.ts` and `src/config/database.ts` into the image
- `eslint.config.ts` — ignores `packages/backend/drizzle.config.ts` (same as `vitest.config.ts`)
- `packages/backend/.env.example` — removed `UNIX_PATH`, `DATABASE_URL`, `TELEGRAM_*`, `XAI_IMAGE_*`; added `APP_UNIX_PATH`, `API_PATH_PREFIX`, `APP_MAX_*_BODY_SIZE`, OAuth, `AI_TEXT_DRIVER`, `MISTRAL_*`, `TURN_*`; `REDIS_PREFIX="uwebsocket:"`
- Docs: `documentation/backend/{configuration,database,deployment,adding-a-feature}.md`, `documentation/guide/{getting-started,project-structure}.md`, `documentation/reference/scripts.md`, `packages/backend/README.md`, plan doc (items 5, 6, 8 marked fixed)

## Evidence of Completion

- `pnpm typecheck` clean
- `pnpm lint` clean
- `pnpm --filter backend test`: 396/396 (incl. `src/config/database.spec.ts`)
- `pnpm docs:build && pnpm docs:verify`: all checks passed
- Manual:
  - `PGSQL_PORT=abc pnpm exec drizzle-kit migrate` → `PGSQL_PORT must be an integer from 1 to 65535, got "abc"` (config loads through the shared module)
  - `PGSQL_PORT=1 pnpm exec drizzle-kit migrate` → `ECONNREFUSED 127.0.0.1:1`
  - `pnpm exec drizzle-kit check` → `Everything's fine`
  - `pnpm --filter backend build`, then `PGSQL_PORT=abc node dist/db/create-database.js` throws the same error; `PGSQL_PORT=1` → `ECONNREFUSED 127.0.0.1:1`
- Not tested: `docker build` (drizzle-kit loading `.ts` config inside the prod image), app start against a real PostgreSQL

## Notes for Next Session

- `config/turn.ts` reads `TURN_*` but nothing imports it; candidate for removal or wiring (out of scope).
