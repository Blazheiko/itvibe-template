# Session Progress Log

## Current State

**Last Updated:** 2026-10-21
**Active Feature:** feat-007 - Database DX (items 7, 10, 11 of `docs/plan/code-issues-found-during-docs.md`)
**Branch:** `feat/db-dx`

Item 10 (`db:seed` was an empty stub) is done per `docs/plan/db-seed-plan.md`. Items 7 (pgvector in README) and 11 (empty `src/drizzle/schema/index.ts`) are not started.

## Status

### Done

- [x] PR #42: feat-007 → `in_progress`
- [x] Item 10: `db:seed`
  - always seeds the 3 `llm_system_prompts` rows (`ON CONFLICT (type) DO NOTHING`); demo admin / user from `SEED_*` only with `--demo`, independent of `APP_ENV`
  - prompt texts and temperature / max tokens come from one source, `config/support.ts`, shared with the runtime fallbacks (translation prompt and generation defaults moved there from the services, no behaviour change)
  - existing users are never modified; admin email owned by a non-admin user → `exists_without_admin_role` warning, no promotion
  - one transaction, pool closed in `finally`, exit code 1 on failure; new `db:seed:prod`
  - docs: `backend/database.md` (Seed section, first production admin, prompt cache warning), `backend/configuration.md` (`SEED_*`), `guide/getting-started.md`, `reference/scripts.md`; `.env.example`

### Not started

- [ ] Item 7: pgvector in README
- [ ] Item 11: empty `src/drizzle/schema/index.ts`

## Files Modified

- `packages/backend/src/db/seed.ts`, `src/db/seed/{prompts,run-seed,drizzle-seed-store}.ts`, `src/db/seed/run-seed.spec.ts`
- `packages/backend/src/config/support.ts`, `src/app/services/support/support-llm-service.ts`, `support-query-translation-service.ts`
- `packages/backend/package.json`, `packages/backend/.env.example`
- `documentation/backend/database.md`, `documentation/backend/configuration.md`, `documentation/guide/getting-started.md`, `documentation/reference/scripts.md`
- `docs/plan/db-seed-plan.md` (new), `docs/plan/code-issues-found-during-docs.md` (item 10 marked fixed)

## Evidence of Completion (item 10)

- `pnpm typecheck`, `pnpm lint` clean
- `pnpm test`: backend 560, frontend 45, shared 3, documentation 26
- `pnpm docs:build && pnpm docs:verify`: all checks passed
- Manual, on a throwaway DB `itvibe_seed_check` (`db:create` → `db:migrate`, dropped afterwards):
  1. `db:seed` → 3 prompts inserted, admin / user `demo_disabled`; second run → all `already_exists`
  2. `db:seed --demo` → admin (`role=admin`) and user inserted, `email_verified_at` set; `validatePassword` on the stored hash → `true`
  3. prompt edited to `EDITED`, rerun with a different password and `ADMIN@seed.TEST` → `already_exists`, prompt text, password hash and role unchanged
  4. `SEED_ADMIN_EMAIL` = existing user's email → `exists_without_admin_role` + warning, role stays `user`
  5. failing insert (email > 255 chars) after the prompts → exit 1, 0 prompts in the DB (rollback)
  6. `pnpm build && db:seed:prod` → same report; `APP_ENV=production db:seed:prod --demo` prints the warning
  7. backend started on that DB logs `PromptService: loaded 3 prompts`
- Not tested: logging in as the seeded admin through the UI and opening `/admin`

## Notes for Next Session

- Merge PR #42, then do items 7 and 11 on this branch, then PR `feat/db-dx` → `main` and flip feat-007 to `done`.
- Out of scope, possible follow-ups: `promptRepository.update` → upsert; demo knowledge-base articles; running `db:seed:prod` in the migration job (item 30).
