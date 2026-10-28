# Session Progress Log

## Current State

**Last Updated:** 2026-10-28
**Active Feature:** feat-042 - CSRF Hardening
**Branch:** `feat/csrf-hardening`
**Plan / tasks:** `docs/plan/csrf-hardening-plan.md` (rev. 6), `docs/plan/csrf-hardening-tasks.md`

## Status

### Done

- [x] Start: PR #131 (feature_list entry + plan + task list)
- [x] PR A — config (`5b9451f`): `CSRF_ENFORCE`/`CSRF_STRICT_ORIGIN` default `true`; `CSRF_ALLOWED_ORIGINS` exact origins, required when `isProductionLike`; dev fallback to `APP_URL`/`FRONTEND_URL` origins; `validateRuntimeConfig` throws on `configError` and logs CSRF warnings; shared `CsrfRejectReason`
- [x] PR B — guard (`b553d93`, `71158c5`): Fetch Metadata → Origin/Referer → token, each only rejects; `Origin: null`/malformed rejected; fail-closed without a session (login CSRF); Redis test of the cold login bootstrap
- [x] PR B2 — frontend (`5722ab8`): confirmed/unconfirmed token, `sessionState` (synced/reconciling/diverged/reloading), silent single-flight `main/init` refresh, one retry only for the same user, reload on account change, `HttpApiError.clientCode`
- [x] PR C — sessions (`c8631f9`): `auth.login` deletes the previous anonymous session too; session helpers follow login/logout (OAuth state cleanup addressed a stale namespace); `change-password` renews the session (`authService.renewSession`) and returns `csrfToken`; audit table in `auth-security.md`
- [x] PR D — Service Worker (`23e0b22`): `classifyRequest` bypasses non-GET, cross-origin and the API first; prefix matching; `isCacheableResponse` on every write; activation drops API entries
- [x] PR E — e2e (`0951b42`): `pnpm --filter frontend test:e2e:security` against the real backend with enforcement on
- [x] Review fixes (`973ac74`, `7f41076`): owner check in `synced`; refresh timeout + per-caller abort + no refresh in `reloading`; no stale session cookie from slow responses (hourly cookie refresh + `beforeSend` check); change-password partial success (`sessionRenewed`) and WS reconnect

## Evidence of Completion

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — clean
- `pnpm test` — backend 970, frontend 121, shared 14, api-playground 14, documentation 26
- `pnpm --filter backend test:redis` (REDIS_TEST_URL set) — 43
- `pnpm --filter frontend test:e2e` — 12
- `pnpm --filter frontend test:e2e:security` — 7: cold login, logout → login, stale token (one retry), session lost / account switched in another tab, rejected mutations without side effects, no API in Cache Storage
- `pnpm docs:build && pnpm docs:verify` — passed
- Mutation checks: the anonymous-session deletion and the session-namespace fix each fail the Redis tests when reverted; removing the SW activation cleanup fails its test
- Manual golden path: the e2e-security scenarios drive the real UI (login form, menu logout) against the backend-served production build

## Notes for Next Session

- Not done here (environment / rollout, tasks T0.4 and R.1–R.6): record actual env per environment, add `CSRF_ALLOWED_ORIGINS` to deploy config **before** merging (a production-like start without it now fails), diagnostic phase with explicit `CSRF_ENFORCE=false`, then enable with a restart.
- E.3: `test:e2e:security` is not in CI (same as `test:e2e:csp`): it needs PostgreSQL and Redis services in the workflow.
- The SW activation cleanup is covered by a unit test, not e2e: in a fresh Chromium context Cache Storage could not be seeded reliably before a worker activates (unregistering a worker also drops it).
- The WS reconnect after a password change is not covered by e2e (unit/controller level only).
- Behaviour changes worth noting in review: the session cookie of an unchanged session is re-sent at most hourly; the SW no longer caches cross-origin requests (e.g. Google Fonts files); `change-password` now rotates the session cookie.
- `logout` of an anonymous session still does not delete that session (pre-existing, harmless).
