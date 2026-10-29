# Session Progress Log

## Current State

**Last Updated:** 2026-10-29
**Active Feature:** feat-044 - Runtime Response Validation
**Branch:** `feat/response-validation`
**Plan:** `docs/plan/response-schema-runtime-validation.md`, tasks: `docs/plan/response-schema-runtime-validation-tasks.md`

## Status

### Done

- [x] T0: PR #141 (feature_list entry + plan and task list)
- [x] T1–T2 (`929b3b8`): `config/response-validation.ts` — `RESPONSE_VALIDATION=strict|log|off` (default `strict` outside production, `off` in production), `RESPONSE_VALIDATION_SAMPLE_RATE` 0..1; invalid value stops the start via `validateRuntimeConfig()`; `.env.example`
- [x] T4 (`90726a5`): `vendor/utils/validation/validate-response.ts` — `createResponseCheck(schema, config)`; logs path/code/expected only (no values), one log line + one Sentry event (tag `response_validation`) per route per minute with a `suppressed` counter; sampling only in `log`; schema output never replaces the payload
- [x] T3, T5–T7 (`22d1fd4`): `hasResponseBody()`/`isEmptyPayload()` shared with `sendResponse`; `NormalizedRouteItem.responseCheck` (required, built once in `routesHandler`); HTTP `checkHandlerResponse` (any status incl. `/ready` 503; not for middleware-stopped, thrown, 3xx/204/205/empty); strict → canonical 500, handler headers dropped, cookies kept; WS strict → `status: 'error'`, `internal_error`, `data: null`
- [x] T8 (`807505f`): crawl of the running backend in `log` then `strict` (≈35 HTTP routes incl. admin, push CRUD, auth) found one mismatch — `GET /api/admin/usage/text` `total` was a bigint string (`count(*)` without `::int`); fixed + pg regression test. Temporary vitest pin to `log` removed
- [x] T9: benchmark — valid check is 3–5% of `JSON.stringify` (1000 users 5.4 µs vs 141 µs); an invalid response costs about as much as serialization
- [x] T10 (`7d3b06c`): `documentation/backend/response-validation.md`, env rows in `configuration.md`, sidebar + `KEY_PAGES`

### Not done / out of scope

- [ ] WS routes not exercised against a running server (covered by dispatcher tests only)
- [ ] `GET /api/admin/history-online` returned 500 locally: the local DB lacks the `user_online.role` migration — unrelated to this feature
- [ ] `pnpm --filter frontend test:e2e` not run locally (backend-only change; e2e on CI does not start the backend)
- [ ] T12 follow-ups and T13 rollout (separate feature `feat-0YY`)

## Evidence of Completion

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — clean
- `pnpm test` — backend 1075, frontend 126, shared 14, api-playground 14, documentation 26
- `PG_TEST_URL=… pnpm --filter backend test:pg llm-usage.pg.test.ts` — 23 passed; the new `countText` test fails without the fix (`'3'` vs `3`)
- Mutation checks: disabling the HTTP and WS call sites fails 5 tests; removing the header reset fails 1
- Manual: backend on :3100 with `RESPONSE_VALIDATION=log` logged `data.total expected a number` for `/api/admin/usage/text`; after the fix, `strict` crawl — no validation errors, no 500 from validation
- `pnpm docs:build && pnpm docs:verify` — passed

## Notes for Next Session

- After merge: PR flipping feat-044 to `done`, then register the rollout feature (T13) and follow-ups (T12) in `feature_list.json`.
