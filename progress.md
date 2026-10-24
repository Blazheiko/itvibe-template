# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-030 - Observability (F13 of `docs/plan/open-issues-roadmap.md`, items 33, 34, 35)
**Branch:** `feat/observability`
**Plan:** `docs/plan/observability-plan.md`; tasks: `docs/plan/open-issues-tasks.md`, F13

## Status

### Done

- [x] F13.S: PR #80 (feat-029 done, feat-030 `in_progress`, plan)
- [x] F13.1 (item 34): `LOG_LEVEL` in `config/logging.ts` (default `info`, invalid → start stops; the logger itself keeps `info`)
- [x] F13.2 (item 33): `requestId` generated at the first step of request handling in `server.ts` (it used to be created in `contextHandler` after the body was read, so 413/415/422 had none) and passed to the context and to `handleError`, which logs through `logger.child({ requestId, userId, route, method })`. Also found: `userId` for `handleError` was read right after the context was created — before `session_web` — so it was always `undefined`; it is now read when the error happens
- [x] F13.3 (item 33): `session_web` rebinds `context.logger` with `userId`; WS logger binds `userData.userId`
- [x] F13.4 (item 35): `GET /<prefix>/ready` — `readinessService` (`SELECT 1` via `healthRepository`, Redis `PING`, `READINESS_CHECK_TIMEOUT_MS` per check, default 1000) → `200 {status:"ok"}` / `503 {status:"unavailable"}`, the failed dependency only in `warn`. The global per-IP limit stays (deviation from the roadmap, documented)
- [x] F13.5: Docker `HEALTHCHECK` on `/api/ready` (body check, timeout 5 s)
- [x] Found during the image check and fixed: a `pg.Pool` `error` without a listener (PostgreSQL drops an idle connection) became an `uncaughtException` and stopped the server; `db.ts` now logs it and `/ready` answers 503 while the database is away
- [x] F13.D: `documentation/backend/{observability,deployment,configuration}.md`, `packages/backend/.env.example`; code-issues 33, 34, 35 fixed

## Evidence of Completion

- RED first: `config/logging.spec.ts` (incl. `logger.level === 'debug'`), `handle-error-logging.spec.ts` (422 and 413 through a child logger with requestId/userId), `session-web.spec.ts` (userId bound only for a known user), `readiness-service.spec.ts` (both ok; DB/Redis failing or hanging → not ready within the timeout, failed dependency named in the warn), `database/db.spec.ts` (pool has an `error` listener, emitting does not throw)
- Manual, backend from source (`APP_ENV=production` for JSON logs, disposable PostgreSQL + Redis):
    - `/api/ready` → `200 {"status":"ok"}`; Redis stopped → `503 {"status":"unavailable"}` in 0.05 s, log `failed: ['redis']`
    - 422 from `POST /api/auth/register/email` → `Handle Error` at level 40 with `requestId`, `route`, `method`
    - logged-in user → handler record with `requestId` and `userId: '2'`
    - PostgreSQL stopped **before the fix** → `uncaughtException`, `EXIT=1`; **after** → process alive, `/ready` 503, `/ping` ok; PostgreSQL back → `/ready` 200
- Docker image: with dependencies `healthy`; PostgreSQL stopped → `unhealthy`, container still `running`, `/api/ping` ok (before the pool fix the container exited)
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 815, frontend 58, shared pass 3, documentation pass 26; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- new: `packages/backend/src/config/{logging,health}.ts` (+ `logging.spec.ts`), `src/app/repositories/health/health-repository.ts`, `src/app/services/core/readiness-service.ts` (+ spec), `src/database/db.spec.ts`, `src/vendor/start/handle-error-logging.spec.ts`, `docs/plan/observability-plan.md` (PR #80)
- updated: `Dockerfile`, `packages/backend/src/vendor/utils/logger.ts`, `src/vendor/start/server.ts`, `src/vendor/utils/context/{http,ws}-context.ts`, `src/vendor/utils/middlewares/ws/session-web.ts` (+ spec), `src/database/db.ts`, `src/app/{controllers/http/core/main-controller,routes/http-routes,repositories/index,start/validate-runtime-config}.ts`, specs `malformed-body`, `redis-unavailable-http`, `packages/shared/src/responses/main-controller.ts`, `packages/backend/.env.example`, docs listed above, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- Next: F14 Static Caching (feat-031).
