# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-021 - Push Access & Methods (F04 of `docs/plan/open-issues-roadmap.md`, items 47, 48, 67)
**Branch:** `feat/push-access`
**Tasks:** `docs/plan/open-issues-tasks.md`, F04

## Status

### Done

- [x] F04.S: PR #58 (feat-036 done, feat-021 `in_progress`); `./init.sh` green
- [x] F04.1 (item 48): `test-push` is `POST` with body `PushSubscriptionTestInputSchema` (`title?` ≤ 200, `body?` ≤ 1000, extra keys rejected) in `shared`; `PushSubscriptionTestQuerySchema` removed; frontend `pushSubscriptionApi.testPush(payload)` sends POST. Found during manual check: `GET /test-push` now hits `GET /:subscriptionId`, and a non-numeric id gave 500 (`BigInt('test-push')`) — all six `:subscriptionId` handlers now answer `404 Subscription not found` for non-numeric ids without calling the service
- [x] F04.2 (item 67): `auth_guard` on every `push-subscriptions` route except `vapid-public-key`
- [x] F04.3 (item 67): new `ws_admin_guard` (`app/middlewares/ws-admin-guard.ts`, kernel) on the admin WS group; HTTP `auth_guard`/`admin_guard` cannot run on WS (no `auth`, different `responseData`). The service role check stays
- [x] F04.4 (item 47, decision R2): endpoint of another user moves only with matching `p256dhKey` and `authKey`, else `409 conflict`
- [x] F04.D: `documentation/backend/{mail-push,routing-middlewares,websocket,adding-a-feature}.md`, `documentation/reference/roles-capabilities.md`; code-issues 47, 48, 67 fixed

## Evidence of Completion

Tests (new):

- `src/app/routes/route-access.spec.ts` on the real route lists: `test-push` only `post`; every push route except `vapid-public-key` has `auth_guard`; anonymous context → `auth_guard` stops the chain with `401` for each of them; both `api/admin/*` WS routes have `ws_admin_guard`. Negative control: removing `auth_guard` from `test-push` fails 2 tests
- `src/app/middlewares/ws-admin-guard.spec.ts`: role `user` / no user → `403` + `forbidden`, handler not called; admin passes
- `push-subscription-service.spec.ts`: same keys → moved to the caller; different `p256dh` or `auth` → `Conflict`, no update/create
- `push-subscription-controller.spec.ts`: ids `test-push`, `12abc`, `-1`, `''` → 404 without a service call; `5` → `5n`

Manual golden path (backend from source on port 3999, disposable `pgvector/pgvector:pg16`, `db:create` + `db:migrate` + `db:seed --demo`, Redis prefix `manual-feat021:` removed afterwards):

| Request                                           | Result                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| anonymous `GET /api/push-subscriptions/test-push` | 401                                                                                 |
| anonymous `POST …/test-push`                      | 401 `unauthorized` (guard)                                                          |
| anonymous `GET /api/push-subscriptions`           | 401                                                                                 |
| anonymous `GET …/vapid-public-key`                | reaches the controller (500 `VAPID keys not configured` — no keys in this env)      |
| user `GET …/test-push`                            | 404 `Subscription not found`                                                        |
| user `POST …/test-push` `{"title":"t"}`           | reaches the sender (500 `VAPID keys not configured`)                                |
| user `POST /api/push-subscriptions` new endpoint  | 200                                                                                 |
| admin `POST` same endpoint, other keys            | 409 `Push subscription belongs to another user`; DB owner still `user@example.test` |
| admin `POST` same endpoint, same keys             | 200; DB owner `admin@example.test`                                                  |
| WS `api/admin/subscribe_online_users` as user     | `status "403"`, `forbidden`                                                         |
| WS same as admin                                  | `status "200"`, `success`                                                           |

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 686, frontend 45, shared pass 3, documentation pass 26; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed.

## Files Modified

- new: `packages/shared/src/schemas/push-subscription/test-push.ts`, `packages/backend/src/app/middlewares/ws-admin-guard.ts` (+ spec), `packages/backend/src/app/routes/route-access.spec.ts`, `packages/backend/src/app/controllers/http/notifications/push-subscription-controller.spec.ts`
- updated: `packages/shared/src/schemas/{index,query/simple}.ts`, `packages/backend/src/app/routes/{http,ws}-routes.ts`, `packages/backend/src/app/middlewares/kernel.ts`, `packages/backend/src/app/controllers/http/notifications/push-subscription-controller.ts`, `packages/backend/src/app/services/notifications/push-subscription-service.ts` (+ spec), `packages/frontend/src/utils/api.ts`, docs listed above, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- `wsUrl` from `/main/init` is built from config (port 3000), not from the request; a backend on another port returns a URL of another process. Not in scope; worth a code-issues item if it bites again.
- Next: F05 Push Data Access (feat-022, depends on feat-021 and feat-036).
