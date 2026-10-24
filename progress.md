# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-036 - PG Test Harness (F19 of `docs/plan/open-issues-roadmap.md`, prerequisite for feat-022 and feat-025)
**Branch:** `feat/pg-test-harness`
**Tasks:** `docs/plan/open-issues-tasks.md`, F19

## Status

### Done

- [x] F19.S: PR #56 (feat-018 done, feat-036 `in_progress`); `./init.sh` green
- [x] F19.1: `vitest.pg.config.ts` (`include: src/**/*.pg.test.ts`, `fileParallelism: false`, global setup), `test:pg`; `vitest.config.ts` excludes `*.pg.test.ts`; `eslint.config.ts` ignores the new config like `vitest.redis.config.ts`
- [x] F19.2: `src/test-support/pg-global-setup.ts` — `CREATE DATABASE itvibe_test_<12 hex>` from `PG_TEST_URL`, `CREATE EXTENSION vector`, drizzle `migrate` into `drizzle.__drizzle_migrations` (same as `drizzle.config.ts`), `PGSQL_*` for the workers, `DROP DATABASE … WITH (FORCE)` in teardown; `src/test-support/pg-test-db.ts` (`hasPg`, `MIGRATIONS_FOLDER`)
- [x] F19.3: `src/database/harness.pg.test.ts` — the app's `db` reaches the throwaway database, `vector` is installed, every migration folder applied, `users` exists
- [x] F19.4: `.github/workflows/pg-tests.yml` (service `pgvector/pgvector:pg16`, same `paths` as `redis-tests.yml`)
- [x] F19.D: `documentation/backend/testing.md` (section «Інтеграційні тести з Redis і PostgreSQL», CI table, gaps), `documentation/reference/scripts.md` (`test:redis`, `test:pg`)

## Evidence of Completion

CI on PR #57:

- [PG tests 40091167699](https://github.com/Blazheiko/itvibe-template/actions/runs/40091167699) ✅ — `Test Files 1 passed (1)`, `Tests 3 passed (3)` (run, not skipped)
- [CI 40091167686](https://github.com/Blazheiko/itvibe-template/actions/runs/40091167686) ✅ `quality`, `e2e`; [Redis tests 40091167743](https://github.com/Blazheiko/itvibe-template/actions/runs/40091167743) ✅

Local (macOS, Node 24.20.0, disposable `pgvector/pgvector:pg16` on `127.0.0.1:55433`):

- `PG_TEST_URL=… pnpm --filter backend test:pg` — 3 passed; afterwards `select count(*) from pg_database where datname like 'itvibe_test_%'` → `0`
- negative control: an assertion changed to fail → `1 failed | 2 passed`, the database is still dropped (`0`); change reverted
- without `PG_TEST_URL`: `1 skipped`, `3 skipped`
- `pnpm --filter backend test` — 671 passed, the pg test is not picked up
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — clean
- `pnpm docs:build && pnpm docs:verify` — `verify-dist: all checks passed`

## Files Modified

- new: `packages/backend/vitest.pg.config.ts`, `packages/backend/src/test-support/pg-global-setup.ts`, `packages/backend/src/test-support/pg-test-db.ts`, `packages/backend/src/database/harness.pg.test.ts`, `.github/workflows/pg-tests.yml`
- updated: `packages/backend/vitest.config.ts`, `packages/backend/package.json`, `eslint.config.ts`, `documentation/backend/testing.md`, `documentation/reference/scripts.md`, `docs/plan/open-issues-tasks.md`, `progress.md`

## Notes for Next Session

- After merge: done PR for feat-036. Next: F02 Docker (feat-019), or F04 (feat-021) → F05 (feat-022) which uses this harness.
- `PG Tests` is not a required check (it has a `paths` filter, like `redis-tests.yml`).
