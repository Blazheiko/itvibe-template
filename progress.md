# Session Progress Log

## Current State

**Last Updated:** 2026-10-21
**Active Feature:** feat-007 - Database DX (items 7, 10, 11 of `docs/plan/code-issues-found-during-docs.md`)
**Branch:** `feat/db-dx`

Item 10 (`db:seed` was an empty stub) is done per `docs/plan/db-seed-plan.md`. Item 7 (pgvector) is done. Item 11 (empty `src/drizzle/schema/index.ts`) is not started.

## Status

### Done

- [x] PR #42: feat-007 → `in_progress`
- [x] Item 10: `db:seed`
  - always seeds the 3 `llm_system_prompts` rows (`ON CONFLICT (type) DO NOTHING`); demo admin / user from `SEED_*` only with `--demo`, independent of `APP_ENV`
  - prompt texts and temperature / max tokens come from one source, `config/support.ts`, shared with the runtime fallbacks (translation prompt and generation defaults moved there from the services, no behaviour change)
  - existing users are never modified; admin email owned by a non-admin user → `exists_without_admin_role` warning, no promotion
  - one transaction, pool closed in `finally`, exit code 1 on failure; new `db:seed:prod`
  - review fix: the failure log no longer prints `DrizzleQueryError` params / pg `detail` / messages (email, password hash, `session_token`); only `name`, `code`, `constraint`, `table`, `column` (`src/db/seed/describe-error.ts`), regression test through the real Drizzle store with a fake pg client
  - review fix: root and backend README describe the real seed; idempotency limit (concurrent `--demo` runs) documented
  - docs: `backend/database.md` (Seed section, first production admin, prompt cache warning), `backend/configuration.md` (`SEED_*`), `guide/getting-started.md`, `reference/scripts.md`; `.env.example`

- [x] Item 7: pgvector documented
  - new section `documentation/backend/database.md#pgvector`: why (Support AI knowledge-base search: `vector(1536)` embeddings, cosine distance `<=>`, RAG), required even without AI (the schema uses the type), where it is used in code, what fails without it, how to install (Docker image, Homebrew/apt, managed services, privileges), how to check, limits (hard-coded 1536, no HNSW index)
  - links from `README.md` (services table + note), `packages/backend/README.md`, `guide/getting-started.md`, `backend/ai.md`, `backend/deployment.md`; stale "not documented" warning removed from `backend/repositories-transformers.md`

### Not started

- [ ] Item 11: empty `src/drizzle/schema/index.ts`

## Files Modified

- `packages/backend/src/db/seed.ts`, `src/db/seed/{prompts,run-seed,drizzle-seed-store,describe-error}.ts`, `src/db/seed/{run-seed,describe-error}.spec.ts`
- `README.md`, `packages/backend/README.md`
- `packages/backend/src/config/support.ts`, `src/app/services/support/support-llm-service.ts`, `support-query-translation-service.ts`
- `packages/backend/package.json`, `packages/backend/.env.example`
- `documentation/backend/database.md`, `documentation/backend/configuration.md`, `documentation/guide/getting-started.md`, `documentation/reference/scripts.md`
- `docs/plan/db-seed-plan.md` (new), `docs/plan/code-issues-found-during-docs.md` (item 10 marked fixed)

## Evidence of Completion (item 10)

- `pnpm typecheck`, `pnpm lint` clean
- `pnpm test`: backend 564, frontend 45, shared 3, documentation 26
- `pnpm docs:build && pnpm docs:verify`: all checks passed
- Manual, on a throwaway DB `itvibe_seed_check` (`db:create` → `db:migrate`, dropped afterwards):
  1. `db:seed` → 3 prompts inserted, admin / user `demo_disabled`; second run → all `already_exists`
  2. `db:seed --demo` → admin (`role=admin`) and user inserted, `email_verified_at` set; `validatePassword` on the stored hash → `true`
  3. prompt edited to `EDITED`, rerun with a different password and `ADMIN@seed.TEST` → `already_exists`, prompt text, password hash and role unchanged
  4. `SEED_ADMIN_EMAIL` = existing user's email → `exists_without_admin_role` + warning, role stays `user`
  5. failing insert (email > 255 chars) after the prompts → exit 1, 0 prompts in the DB (rollback)
  6. `pnpm build && db:seed:prod` → same report; `APP_ENV=production db:seed:prod --demo` prints the warning
  6a. after the review fix, on a throwaway DB: a failing insert prints `DrizzleQueryError` / `caused by: error code=22001` only; a wrong port prints `Error code=ECONNREFUSED connect ECONNREFUSED 127.0.0.1:5999`
  6b. negative control: with the old `console.error(..., err)` the regression test fails (email in the output)
  7. backend started on that DB logs `PromptService: loaded 3 prompts`
- Not tested: logging in as the seeded admin through the UI and opening `/admin`

## Evidence of Completion (item 7)

- Error texts checked on `postgres:17-alpine` (no pgvector): `CREATE EXTENSION IF NOT EXISTS vector` → `extension "vector" is not available`; a `vector(3)` column → `type "vector" does not exist`
- `pnpm docs:build && pnpm docs:verify`: all checks passed; anchors `#pgvector`, `#support-ai-і-база-знань`, `#postgresql-і-redis-через-docker` exist in the built HTML
- documentation tests 26/26, `pnpm lint` clean

## Notes for Next Session

- Merge PR #42, then do item 11 on this branch, then PR `feat/db-dx` → `main` and flip feat-007 to `done`.
- Out of scope, possible follow-ups: `promptRepository.update` → upsert; demo knowledge-base articles; running `db:seed:prod` in the migration job (item 30).
