# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-025 - Layering Cleanup (F08 of `docs/plan/open-issues-roadmap.md`, items 22, 24, 25)
**Branch:** `feat/layering-cleanup`
**Tasks:** `docs/plan/open-issues-tasks.md`, F08

## Status

### Done

- [x] F08.S: PR #62 (feat-022 done, feat-025 `in_progress`); `./init.sh` green
- [x] F08.1 (item 24): barrel exports `promptRepository`, `supportRepository`, `supportKnowledgeRepository` and their types (+ `AdminUserListFilters`, `TextFilter`); 12 files outside `app/repositories` switched from file paths to the barrel
- [x] F08.2 (item 24): `user-online-repository` no longer imports the logger; `completeBySocketUuid` returns `false` and `userOnlineService.trackDisconnected` writes the same warning
- [x] F08.3 (item 22): `admin-user-controller` → new `adminUserService.listUsers`; `ws-coordinator` → new `userRoleService.findRole`
- [x] F08.4 (item 22): `prompt-controller` and `llm-usage-controller` take `PromptType`/`PromptUpdate`/`TextFilter` from their services
- [x] F08.5 (item 22): **changed from the plan** — instead of documenting `admin_guard` as an exception, it also uses `userRoleService.findRole`, so there are no exceptions. Rules documented in `architecture.md` and locked by `src/app/layering.spec.ts`
- [x] F08.6 (item 25): **changed from the plan** — instead of wrapping two queries in `db.transaction`, `clearEmbedding` is one `UPDATE` (`embedding = NULL` with `updatedAt`), atomic by itself; `setEmbedding` uses `update().set()`, `searchByEmbedding` references schema columns
- [x] F08.D: `documentation/backend/{architecture,repositories-transformers,ai}.md`; code-issues 22, 24, 25 fixed

## Evidence of Completion

- `src/app/layering.spec.ts` (5 rules: controllers/middlewares/websocket without repositories; repositories only via the barrel; barrel exports every `*-repository.ts`; no logger in repositories; no `#database` in services). Negative control: an added `userRepository` import in `admin-user-controller.ts` fails with `controllers/http/admin/admin-user-controller.ts -> #app/repositories/index.js`
- `src/app/repositories/support/support-knowledge.pg.test.ts`: RED first (`clearEmbedding` made 2 queries), then green — one query, vector dropped; `setEmbedding` stores; `searchByEmbedding` orders active articles by distance (0, 1) and skips the inactive one
- unit: `admin-user-service.spec.ts` (filters passed, mapping incl. `email: null` → `''`), `admin-guard.spec.ts` (anonymous / user / deleted user → 403, admin passes via `findRole(7n)`), `user-online-service.spec.ts` (warning only when no record)
- `PG_TEST_URL=… pnpm --filter backend test:pg` — 18 passed
- Manual (backend from source on 3999, disposable DB, demo users; Redis keys `manual-feat025:*` removed afterwards): user `GET /api/admin/users?limit=10` → 403 `Admin access required`, admin → 200 `success` with `{ id, name, email, registeredAt }` items; WS `api/admin/subscribe_online_users`: user → `403 forbidden`, admin → `success` (role set by `userRoleService` in `ws-coordinator`)
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 703, frontend 45, shared pass 3, documentation pass 26; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- new: `packages/backend/src/app/services/admin/admin-user-service.ts` (+ spec), `packages/backend/src/app/services/user/user-role-service.ts`, `packages/backend/src/app/middlewares/admin-guard.spec.ts`, `packages/backend/src/app/services/communication/user-online-service.spec.ts`, `packages/backend/src/app/layering.spec.ts`, `packages/backend/src/app/repositories/support/support-knowledge.pg.test.ts`
- updated: `packages/backend/src/app/repositories/{index.ts,communication/user-online-repository.ts,support/support-knowledge-repository.ts}`, controllers `admin-user`, `prompt`, `llm-usage`; `middlewares/admin-guard.ts`, `websocket/ws-coordinator.ts`, services `prompt`, `llm-usage`, `user-online`, 5 support services, 2 transformers; docs listed above; `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- Next: F09 Validation Cleanup (feat-026) or F02 Docker (feat-019).
