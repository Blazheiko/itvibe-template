# Session Progress Log

## Current State

**Last Updated:** 2026-10-21
**Active Feature:** feat-016 - Redis Main Client Fast Failure (code-issues item 70)
**Branch:** `feat/redis-main-client-timeout`

Goal: while Redis is down or slow, the main client (sessions, WS tokens) fails fast with `503 service_unavailable` instead of hanging ~45 s and answering `500`; WS connections stay open; one Sentry event per incident. Plan: `docs/plan/redis-main-client-timeout-plan.md`; tasks: `docs/plan/redis-main-client-timeout-tasks.md`.

## Status

### Done

- [x] T0.1 PR #36 (feat-016 row, plan, task list) — open, not merged yet
- [x] T0.2 branch, `./init.sh` green (backend 471, frontend 41)
- [x] T0.3 latency, local Redis, 20 000 ops each: `SETEX` p50 0.41 / p99 2.5 / max 33 ms; `GETEX` p50 0.38 / p99 1.9 / max 8.9 ms → default `REDIS_COMMAND_TIMEOUT_MS=500` kept
- [x] T1 config (`REDIS_COMMAND_TIMEOUT_MS`, `REDIS_LOGOUT_ALL_DEADLINE_MS`, validated at startup) and client options (`redis-main-options.ts`)
- [x] T2 `RedisUnavailableError` + `isRedisUnavailable`, `redis-health.ts` (one `error` per incident, `warn` ≤ 1/min, PING every 2 s while unavailable, recovery on success/PING/`ready`), `withRedis`, Sentry skip by `err.type`, `redisHealth.stop()` before `quit` on shutdown
- [x] T3 session storage, WS token, refresh/revoke through `withRedis`; `destroyAllSessions` deadline with remaining budget per `await`
- [x] T4 `handleError` → 503 + `Retry-After: 1`; `AppError` `ServiceUnavailable` via `tryInternal` (login, WS token, logout, logoutAll); new shared code `service_unavailable`
- [x] T5 `pong` first without Redis; `wsSessionHandler` → `ok | missing | unavailable`; `service_unavailable` reply with the request `event`, connection kept
- [x] T6 `verifyUpgradeToken` → `ok | missing | unavailable`; upgrade 503 before `res.upgrade`
- [x] T7 frontend: `settleApiResponse` (extracted from `messageHandler`) rejects at once; `api.logoutAll` on 503 returns an error (no UI for logoutAll exists)
- [x] T8 integration tests (`redis-main.redis.test.ts`, `test-support/redis-postponed.ts`)
- [x] T9 `.env.example`, docs (configuration, request-lifecycle, observability, websocket, auth-security, database), code-issues item 70 closed
- [x] T10.1 manual verification (below)
- [x] Review of 97c4e91 (REQUEST CHANGES, both about logoutAll), fixed:
  - [HIGH] a stopped run deleted the caller's own session, so the repeat got 401/403: the current session is now skipped and deleted last, together with the cursor key in one `MULTI`
  - [MEDIUM] every repeat restarted SCAN at 0: the cursor is saved after each batch and a repeat resumes from it
- [x] Review of 813c3f6 (HIGH): password reset (`destroyAllSessions` without a kept session) resumed from the cursor of a stopped logoutAll and left the skipped old session valid. Fixed: the cursor is used only by interactive logoutAll and keyed by its session (`logout_all:cursor:<userToken>:<sessionId>`); full revocation always scans from 0 and never touches a cursor

### Not done

- [ ] T10.2 E2E: 8/12 fail — the same 8 fail on `main` (see Evidence); per the task list T10.2 stays open until they pass
- [ ] T10.3 review, merge, flip feat-016 to `done` (after PR #36 merges)

## Files Modified

- Backend: `config/redis.ts`, `database/{redis,redis-main-options,redis-health,redis-rate-limit}.ts`, `vendor/utils/network/errors/redis-unavailable-error.ts`, `vendor/utils/logger.ts`, `vendor/start/server.ts`, `vendor/utils/network/ws-handlers.ts`, `vendor/utils/session/{redis-session-storage,session-handler}.ts`, `app/websocket/ws-session-auth.ts`, `app/services/auth/generate-ws-token-service.ts`, `app/services/shared/{errors,result-helpers}.ts`, `app/start/validate-runtime-config.ts`, `index.ts`, `.env.example`
- Shared: `errors/error-codes.ts` (`service_unavailable`)
- Frontend: `utils/ws-api-response.ts` (new), `composables/useWebSocketConnection.ts`
- Tests: `redis-health.spec.ts`, `redis.spec.ts`, `redis-unavailable-error.spec.ts`, `redis-session-storage.spec.ts`, `ws-session-handler.spec.ts`, `ws-session-auth.spec.ts`, `redis-unavailable-http.spec.ts`, `ws-redis-unavailable.spec.ts`, additions to `auth-service.spec.ts`, `logger.spec.ts`, `validate-runtime-config.spec.ts`; frontend `ws-api-response.spec.ts`, `api-logout-all.spec.ts`; `redis-main.redis.test.ts`
- CI comment: `.github/workflows/redis-tests.yml`
- Docs: `documentation/backend/{configuration,request-lifecycle,observability,websocket,auth-security,database}.md`, `docs/plan/code-issues-found-during-docs.md`

## Evidence of Completion

- `pnpm typecheck`, `pnpm lint` clean
- `pnpm test`: backend 550/550, frontend 45/45, shared 3/3, documentation 26/26
- `REDIS_TEST_URL=redis://127.0.0.1:6379/15 pnpm --filter backend test:redis`: 31/31 on Redis 7.4.11 (16 existing + 15 new)
  - `logout-all-retry.redis.test.ts`: the route chain `session_web → csrf_guard → auth_guard → AuthController.logoutAll` (CSRF enforced); the first run stopped by `CLIENT PAUSE WRITE` answers 503 without `deletedCount` and keeps the current session; the repeat passes the guards, succeeds, and leaves no sessions and no cursor key. With the old call (`destroyAllSessions(token)` without the kept session) the test fails
  - regression for the 813c3f6 finding (`logout-all-retry.redis.test.ts`): 301 sessions over several SCAN pages, the state a stopped logoutAll leaves (pages up to the one with the current session deleted except it, cursor past it, saved under both the old shared and the new key), then the password-reset call → no sessions left. On 813c3f6 the same test fails with the old session surviving
  - unit (`redis-session-storage.spec.ts`, in-memory keyspace with real cursors): a stopped run keeps the session and saves a cursor, the repeat starts from it; on 404 keys (41 pages) with each attempt cut after a few pages, repeats finish, SCAN starts at 0 only once and rescans at most the interrupted page per attempt. This test also caught a full rescan when the stop fell between deleting the cursor key and the kept session, now one `MULTI`
  - postponed-command signal confirmed: `flags=b … qbuf=0 … cmd=setex`, `blocked_clients:1`; the fallback signal has its own test
  - control runs with default ioredis retries (offline queue, resend, `maxRetriesPerRequest: null`) **do** resend SETEX/DEL after `CLIENT KILL` (asserted in the suite)
  - with `enableOfflineQueue: true`, `autoResendUnfulfilledCommands: true`, `maxRetriesPerRequest: null` patched into `redis-main-options.ts`, 4 tests fail (contract + 3 no-resend tests), so they discriminate; reverted
- `pnpm docs:build && pnpm docs:verify`: all checks passed
- Manual (two backends from `dist` on 3101/3102, separate `redis-server --port 6390`, `REDIS_PREFIX=ft016:`, sessions + WS tokens seeded for user 2, Redis stopped with `shutdown save` for ~19 s):
  - WS on both ports: `pong` every 2 s throughout the outage (0–12 ms), no close; app requests got `{status:"error", event:"api/admin/subscribe_online_users", error.code:"service_unavailable"}`; after recovery the same request reaches the handler again (`403`: user 2 is not an admin)
  - HTTP `GET /api/main/init` on both: `503`, `Retry-After: 1`, body `service_unavailable` without ioredis text (`APP_ENV=manual-test`), ~2 ms
  - upgrade with a valid-format token: `503`, `Retry-After: 1` in 1.7 ms
  - logs per process: one `Redis unavailable` (sentryCapture) per incident, `Redis recovered` with `downMs: 19079`; no restart needed, 2 seeded sessions still in Redis, HTTP back to normal (`401` from auth_guard in 2 ms)
  - after this run the per-request log of `handleError` was renamed to `Request failed: Redis unavailable` so it is not confused with the incident event
- E2E `pnpm --filter frontend test:e2e` (backend on 3000): 4 passed, 8 failed — `mobile-layout.spec.ts` "registration submit button…" and "support input stays visible…" on all 4 browsers (`toBeVisible` not found). The same 8 fail on a clean `main` worktree with the same setup, so they are not caused by this branch
- Not tested:
  - `logoutAll` against a running server during an outage (the route chain is covered by `logout-all-retry.redis.test.ts`)
  - resumed SCAN across a real large keyspace (unit test with an in-memory keyspace)
  - `redis-tests.yml` on GitHub (runs on the PR)
  - production timeout value (needs the target network)

## Notes for Next Session

- Merge PR #36 first; then this branch's PR.
- The 8 failing `mobile-layout` E2E tests on `main` need their own fix (outside feat-016); T10.2 is open until then.
- Readiness endpoint (item 35) can use `redisHealth.state`.
