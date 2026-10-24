# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-034 - Drop users.is_admin (F17 of `docs/plan/open-issues-roadmap.md`, item 66, decision R5)
**Branch:** `feat/drop-is-admin`
**Tasks:** `docs/plan/open-issues-tasks.md`, F17

## Status

### Done

- [x] F17.S: PR #88 (feat-033 done, feat-034 `in_progress`)
- [x] F17.1: dev DB `SELECT count(*) FROM users WHERE is_admin <> (role = 'admin')` — **0** mismatches (94 users, 1 admin by both fields)
- [x] F17.2: `isAdmin` removed from `user-transformer.ts`, the auth spec fixture, the backend README and from the Drizzle schema (separate commit, the column still exists in the DB at that point — the schema field had to go too, otherwise the transformer would start leaking it). Left: frontend `userStore.isAdmin()` (reads `role`), the `isAdminChannelSubscribed` WS flag, an "extra key" fixture in `ws-payload-guards.spec.ts`
- [x] F17.3: migration `20261024171546_drop_users_is_admin` — `ALTER TABLE "users" DROP COLUMN "is_admin";`
- [x] F17.D: `database.md` (migration row with the irreversibility note), `roles-capabilities.md`, `repositories-transformers.md`, `architecture.md`, `glossary.md`; code-issues 66 fixed

## Evidence of Completion

- `drizzle-kit check` — clean
- fresh DB `itvibe_f17`: `db:migrate` (3 migrations) succeeded, no `is_admin` column; `db:seed --demo` succeeded
- manual golden path on that DB (backend on :3199): admin login `success` with `role: admin`, `GET /api/admin/knowledge-base/init-status` → 200 for the admin and 403 for the user
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` passed; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed
- note: drizzle config reads `PGSQL_DB_NAME`, not `DATABASE_URL` — a `DATABASE_URL=... db:migrate` run went to the dev DB and failed on the init migration (`type "chat_role" already exists`) without changes; the dev DB's migration journal is out of sync with the folder and still has `is_admin`

## Files Modified

- new: `packages/backend/src/drizzle/migrations/20261024171546_drop_users_is_admin/`
- updated: `packages/backend/src/database/schema.ts`, `src/app/transformers/user-transformer.ts`, `src/app/services/auth/auth-phone-foundation.spec.ts`, `packages/backend/README.md`, docs listed above, `docs/presentations/PRESENTATION.html`

## Notes for Next Session

- F18 (feat-035): ESLint strictTypeChecked, three PRs
