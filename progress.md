# Session Progress Log

## Current State

**Last Updated:** 2026-10-21
**Active Feature:** feat-013 - Shared Rate-Limit Counter (in_progress, ready for review)
**Branch:** `feat/redis-rate-limit`

Plan: [docs/plan/redis-rate-limit-plan.md](docs/plan/redis-rate-limit-plan.md) (rev. 10). Tasks: [docs/plan/redis-rate-limit-tasks.md](docs/plan/redis-rate-limit-tasks.md). Start PR: #31.

Goal: HTTP and WS-message limits stay in-memory (process protection); WS upgrade gets a Redis level 2; sensitive auth actions use Redis through the `config/throttle-policies.ts` registry; close login / change-password / forgot-password gaps; document both levels.

## Status

### Done

- [x] Stage 0 — PR #30 merged, PR #31 opened, branch + progress, `./init.sh` green
- [x] Stage 1 — dedicated Redis connection for limits (`database/redis-rate-limit.ts`)
- [x] Stage 2 — policy registry, `consumeAuthThrottle(policy, key)`, 14 call sites migrated, fail-closed tests
- [x] Stage 3 — WS upgrade level 2 (Lua sliding log), level 1 default 60 → 120
- [x] Stage 4 — login throttle, unified login response, frontend hint
- [x] Stage 5 — change-password, forgot-password, resend-verification, reset-password, verify-email
- [x] Stage 6 — `.env.example`
- [x] Stage 7 — `test:redis` suite + `redis-tests.yml` CI job
- [x] Stage 8 — documentation
- [x] Stage 9 — manual verification, latency measurement, evidence

### Next

- [ ] Review and merge the feat-013 PR, then flip feat-013 to `done` in `feature_list.json` via PR to `main`
- [ ] After #31 merges: rebase on `main` (branch was cut from `chore/feat-013-start`)

## Files Modified

- Backend: `config/throttle-policies.ts` (new), `config/rate-limit.ts`, `database/redis-rate-limit.ts` (new), `index.ts`, `app/start/validate-runtime-config.ts`, `app/services/auth/{auth-throttle-service,auth-service,password-reset-service,email-verification-service,sms-auth-challenge-constants}.ts`, `app/controllers/http/auth/auth-controller.ts`, `vendor/utils/rate-limit/{redis-sliding-log,upgrade-rate-limit}.ts`, `vendor/utils/network/ws-handlers.ts`, `.env.example`, `vitest.config.ts`, `vitest.redis.config.ts` (new), `package.json` (`test:redis`)
- Tests: unit specs for every stage; `*.redis.test.ts` (3 files) + `test-support/redis-test-client.ts`
- Frontend: `locales/en.ts` (login error hint)
- CI: `.github/workflows/redis-tests.yml`; `eslint.config.ts` (ignore `vitest.redis.config.ts`)
- Docs: `documentation/backend/{auth-security,configuration,websocket,deployment}.md`; plan (thresholds, failure table, latency); code-issues item 2 closed, item 70 added

## Evidence of Completion

- `pnpm typecheck` clean
- `pnpm lint` clean
- `pnpm test`: backend 466/466, frontend 41/41, shared 3/3, documentation 26/26
- `REDIS_TEST_URL=redis://127.0.0.1:6379/15 pnpm --filter backend test:redis`: 16/16, no keys left behind; a deliberately broken Lua (`count <= max`) fails 7 tests
- Production client contract against a real server (`redis-rate-limit.redis.test.ts`, uses `rateLimitRedisOptions` as is): `commandTimeout` 50 ms fires under `CLIENT PAUSE WRITE` (< 300 ms); an in-flight command killed with `CLIENT KILL` is not resent after reconnect and commands fail fast while reconnecting; the client reconnects by itself (no manual `connect()`). With `autoResendUnfulfilledCommands: true` the resend test fails, so it discriminates
- `pnpm docs:build && pnpm docs:verify`: all checks passed; shared-limits table rows match the registry 21/21
- Manual (two backend processes on 3101/3102 from `dist`, separate `redis-server --port 6390`, `REDIS_PREFIX=ft013:`):
  - startup: 5 Redis clients (2 per backend — main + rate-limit — plus redis-cli)
  - WS upgrade loop alternating ports, invalid token: `60 × 401`, first `429` at attempt 61 (each process saw only 32, below its level 1 of 120), `ZCARD rl:upgrade:127.0.0.1 = 60`, `Retry-After: 60`
  - login with a wrong password alternating ports: 12 × `401 Invalid email or password`; Redis `login_ip = 12`, `login_identifier = 12`, PTTL ≈ 900 000 ms (one shared budget)
  - too-short password → `422` from the validator, identifier counter not created (an invalid body does not consume)
  - temporary user: 1 wrong attempt (`login_identifier = 1`), then correct login `200` → identifier key deleted, `login_ip` kept counting (14 → 15); the user was deleted from the local DB afterwards
  - whole Redis stopped: upgrade with an invalid token still `401` (level 2 skipped, one `warn` "relying on the local limit"); upgrade with a valid-format token and login hang ~45 s and end with `500 MaxRetriesPerRequestError` from the **main** client (session read) — pre-existing behaviour, documented, filed as code-issues item 70
  - Redis back: login and upgrade are counted in Redis again without restarting the backends
- Latency (local Redis, 2000 `EVAL` of the throttle script): p50 0.37 ms, p99 1.6 ms, max 24 ms → default `RATE_LIMIT_REDIS_TIMEOUT_MS=50` kept
- Not tested:
  - scenario «only the rate-limit connection fails» end to end through running backends (the connection drop itself is covered by `redis-rate-limit.redis.test.ts` with `CLIENT KILL`, the limiter fallback by `upgrade-rate-limit.redis.test.ts`)
  - login hint in the browser and `pnpm --filter frontend test:e2e` (only the i18n string changed; no e2e test references it)
  - production timeout value (needs the target network)
  - `redis-tests.yml` on GitHub (runs on the PR)

## Notes for Next Session

- code-issues item 70 (main Redis client without timeout) is a good follow-up feature.
- `src/config/turn.ts` is still unused (unrelated).
