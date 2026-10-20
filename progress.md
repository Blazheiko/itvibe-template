# Session Progress Log

## Current State

**Last Updated:** 2026-10-20
**Active Feature:** feat-005 - Security Hardening (in_progress)
**Branch:** `feat/security-hardening`

Scope (items from [docs/plan/code-issues-found-during-docs.md](docs/plan/code-issues-found-during-docs.md)): 1 (CSP), 2 (WS upgrade / per-IP rate limit), 3 (tokens in logs), 9 (`broadcastToChannel` runtime guard).
CSP plan: [docs/plan/csp-fix-plan.md](docs/plan/csp-fix-plan.md). Rate-limit plan: [docs/plan/ws-upgrade-rate-limit-plan.md](docs/plan/ws-upgrade-rate-limit-plan.md). Start PR: #21 (feat-005 → in_progress).

## Status

### What's Done

- [x] Item 1 — CSP applied to every response type (plan steps 1–8)
- [x] Item 2 — HTTP L1 per-IP limit, WS upgrade per-IP limit, bounded rate-limit store (Redis counter left open)

### In Progress / Next

- [ ] Item 3 — stop logging WS token / `userToken`
- [ ] Item 9 — runtime channel check in `broadcastToChannel`

## Item 2 (rate limit) — summary

- `vendor/utils/rate-limit/rate-limit-store.ts` (new, replaces `rate-limit-counter.ts`): rejected attempts are not stored, exact `retryAfterMs`, sliding log ≤ `max` per key, fixed window for L1, hard key cap (scan ≤ 64 oldest, then FIFO eviction), GC only on a 60 s timer.
- `http-rate-limit.ts`: `checkGlobalRateLimit` (L1, headers only on reject) + per-route limit on the store. `ws-rate-limit.ts` ported, contract unchanged.
- `upgrade-rate-limit.ts` (new) → `handleUpgrade` checks it first: 429 + `Retry-After` / 503, before token and session lookup.
- `server.ts`: L1 before the route limit in `setHttpHandler`; in `server.any("/*")` for API 404, preflight and plain HTTP on the WS path (`appConfig.pathPrefix`).
- `config/rate-limit.ts` (new): `HTTP_GLOBAL_RATE_LIMIT_*` (600/60 s), `WS_UPGRADE_RATE_LIMIT_*` (60/60 s), strict integer validation → `validateRuntimeConfig()`; proxy warning (`getProxyWarning`) in production-like mode.
- Docs: `auth-security.md` (two branches of layers, store semantics, overflow warning), `configuration.md`, `deployment.md` (nginx edge limit), `.env.example`.

### Decisions

- Upgrade default raised from 30 to 60/min: one tab reconnects every 5 s (12/min); tested with 3 tabs.
- Redis counter not done: the HTTP check must stay synchronous (before `res.onData`). Documented, edge limit recommended.
- Item 18 (refuse upgrade without a live session) stays out of scope: invalid-format tokens still get 401, valid-format ones without a session still upgrade and are closed with 4001.

## Evidence of Completion (item 2)

- `pnpm typecheck` — clean; `pnpm lint` — 0 errors; `pnpm test` — pass (backend 59 files / 387 tests)
- New tests: `rate-limit-store.spec.ts` (bounded state, recovery exactly at Retry-After after 50 rejections, key cap with `maxKeys: 4`, scan bound), `http-rate-limit.spec.ts`, `upgrade-rate-limit.spec.ts` (incl. 3-tab reconnect), `ws-upgrade-rate-limit.spec.ts`, `server-rate-limit.spec.ts` (one bucket for route/404/preflight/WS-path HTTP, counted once, `API_PATH_PREFIX`, static not counted), `validate-runtime-config.spec.ts` (invalid values, proxy warning)
- `rate-limit.transport.spec.ts` on a real uWS server: small POST keeps its body, blocked POST never reaches the handler, real handshake 101 → 429 + `Retry-After` → 101 after the window. Mutation check: an `await` before the body read makes the POST tests hang and fail.
- `pnpm docs:build && pnpm docs:verify` — pass

Manual check, `pnpm prod:local` with `HTTP_GLOBAL_RATE_LIMIT_MAX=5 WS_UPGRADE_RATE_LIMIT_MAX=3 WS_UPGRADE_RATE_LIMIT_WINDOW_MS=5000` (handshake via `node:http.request` with full upgrade headers):

```text
GET /api/main/init ×6
  1–5: HTTP/1.1 401 Unauthorized
  6:   HTTP/1.1 429 Too Many Requests  X-RateLimit-Limit: 5  Retry-After: 60
WS /api/websocket
  1–3: upgrade 101
  4:   response 429 retry-after=5
  after 5.1 s: upgrade 101
```

## Item 1 (CSP) — summary

- `packages/backend/src/vendor/utils/network/csp.ts` (new): policy building, origin/report-URI validation, single-mode resolution.
- `packages/backend/src/config/csp.ts`: directives from `APP_URL`, `getWsUrl()`, `CDN_URL`, `CSP_*`; config errors surface in `validateRuntimeConfig()`.
- `setSecurityHeaders(res, headers, cspKind)` writes the CSP; wired into HTML (200/304, SPA fallback), SVG, static 400/404, CORS `OPTIONS`, doc page. `/service-worker.js` gets none.
- `scripts/prod-local.sh` / `pnpm prod:local`; `pnpm --filter frontend test:e2e:csp` (Playwright, `e2e-csp/`).
- Docs: `documentation/backend/{auth-security,configuration,deployment,testing}.md`.

### Decisions / deviations from the plan

- Playwright CSP checks use a separate config (`playwright.csp.config.ts`) instead of a project in `playwright.config.ts`: its `webServer` is the backend, not Vite.
- Enforce and report-only run sequentially on one port: the bundle has `VITE_BASE_URL` baked in, so a second instance on another port would call the wrong API origin.
- `prod:local` runs `APP_ENV=local`, `APP_IS_PRODUCTION=false`: on plain http `getWsUrl()` would return `wss://` and `upgrade-insecure-requests` would break all requests. Hence `upgrade-insecure-requests` is covered by unit tests only, not e2e (needs HTTPS).
- Media origin = `CDN_URL` only (the client receives `cdnUrl` from the API); no S3 origin is added because the browser never talks to S3 directly.
- ArkType removed from the frontend runtime bundle: its JIT probe (`new Function`) was a CSP `eval` violation on every page load. `useBroadcastHandler` uses `ws-payload-guards.ts` (parity-tested against the ArkType schema); `ErrorCodeSchema` moved from `shared/errors` to `shared/responses/error-code-schema.ts`. `index.js` 1 042 259 → 873 428 bytes. e2e now fails on any CSP violation.
- The feat-005 item 4 dependency is gone: `prod:local` creates `backend/public` before start.

## Evidence of Completion (item 1)

- `pnpm typecheck` — clean
- `pnpm lint` — 0 errors (pre-existing warnings only)
- `pnpm test` — pass (backend 54 files / 338 tests, incl. `csp.spec.ts`, `static-server-csp.spec.ts` 33 cases, `server-csp.spec.ts` 15 cases)
- `pnpm --filter frontend test:e2e:csp` — enforce 7/7, report-only 7/7 (WS confirmed by a `pong` frame, CDN image `naturalWidth > 0`, image outside `img-src` blocked/reported); earlier 5/5; with `CSP_ENABLED=false` the header, inline-script and fetch tests fail (proves they test CSP)
- `pnpm docs:build && pnpm docs:verify` — pass
- `pnpm --filter frontend test:e2e` — `mobile-layout.spec.ts` fails on `.modal.register-modal`, a selector that no longer exists in `src`; pre-existing, unrelated to CSP

Manual check, `pnpm prod:local` with `ENABLED_CORS=true` (GET via `curl -sS -D - -o /dev/null`):

```text
GET /
  HTTP/1.1 200 OK
  content-security-policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://stage-lfl-s3.fra1.cdn.digitaloceanspaces.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http://localhost:3000 ws://localhost:3000 ws://localhost:* ws://127.0.0.1:*
GET /index.html
  HTTP/1.1 200 OK
  content-security-policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://stage-lfl-s3.fra1.cdn.digitaloceanspaces.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http://localhost:3000 ws://localhost:3000 ws://localhost:* ws://127.0.0.1:*
GET /settings
  HTTP/1.1 200 OK
  content-security-policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://stage-lfl-s3.fra1.cdn.digitaloceanspaces.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http://localhost:3000 ws://localhost:3000 ws://localhost:* ws://127.0.0.1:*
GET /favicon.svg
  HTTP/1.1 200 OK
  content-security-policy: default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'
GET /service-worker.js
  HTTP/1.1 200 OK
GET /missing.js
  HTTP/1.1 404 Not Found
  content-security-policy: default-src 'none'; frame-ancestors 'none'
GET /api/nope
  HTTP/1.1 404 Not Found
  content-security-policy: default-src 'none'; frame-ancestors 'none'
GET /api/main/init
  HTTP/1.1 401 Unauthorized
  content-security-policy: default-src 'none'; frame-ancestors 'none'
OPTIONS /api/main/init (Origin http://app.test)
  HTTP/1.1 200 OK
  content-security-policy: default-src 'none'; frame-ancestors 'none'
  Access-Control-Allow-Origin: http://app.test
```

## Notes for Next Session

- Continue with items 3 and 9 on this branch.
- `feature_list.json` → `done` only after all four items.
- Open: CSP is not browser-tested on the production branch (HTTPS/WSS, `upgrade-insecure-requests`) or against real S3/CDN (avatar upload, screenshot redirect). Needs a staging check.
