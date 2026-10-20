# Session Progress Log

## Current State

**Last Updated:** 2026-10-19
**Active Feature:** feat-011 - Documentation v2
**Branch:** `feat/docs-v2`

Plan: [docs/plan/vitepress-documentation-plan.md](docs/plan/vitepress-documentation-plan.md) (rev. 3)
Task list: [docs/plan/vitepress-documentation-tasks.md](docs/plan/vitepress-documentation-tasks.md), stage 6
Known code issues: [docs/plan/code-issues-found-during-docs.md](docs/plan/code-issues-found-during-docs.md)

Previous feature feat-003 (docs v1) is done; its log is in git history of this file (`main` @ `327d0de`).

## Status

### What's Done

- [x] T6.4 — `documentation/backend/websocket.md` (PR #9, merged)
- [x] T6.1–T6.3 — controllers-services, repositories-transformers, validation (one PR, see Decisions)

- [x] T6.8b — `documentation/backend/deployment.md` (stacked on the T6.1–T6.3 PR)

- [x] T6.6 — `documentation/backend/observability.md` (stacked on T6.8b)

- [x] T6.8a — `documentation/backend/testing.md`

- [x] T6.7 — `documentation/backend/caching-etag.md`

### What's In Progress

- [ ] T6.5a — `documentation/backend/storage.md`

### What's Next

Order (backend first): T6.4 websocket → T6.1 controllers-services → T6.2 repositories-transformers →
T6.3 validation → T6.8b deployment → T6.6 observability → T6.8a testing → T6.7 caching-etag →
T6.5a–c storage / mail-push / ai → T6.9a–c shared / frontend / playground → T6.10a–d.

Each page = one PR to `main`: code → page → sidebar → `KEY_PAGES` → `docs:build && docs:verify` → CI.

## Blockers / Risks

- [ ] PR #8 (register feat-011) must be merged before the first page PR.

## Decisions Made

- **New ID feat-011** instead of reusing the freed feat-004, to keep IDs unique.
- **Page PRs from this branch**: each page gets its own short-lived PR branch cut from `feat/docs-v2`
  or from `main`, so reviews stay one page per PR.

- **T6.1–T6.3 in one PR**: the three pages cross-link each other, and the build fails on dead
  links, so splitting them would require temporary link removal. Exception to one-page-per-PR.

## Files Modified This Session

- `progress.md` — initialised for feat-011.

## Evidence of Completion

**T6.4 WebSocket** (`feat/docs-v2`):

- Page written from code (sub-agent), reviewed in main session; key claims re-checked in code:
  dispatcher returns `not_found` «Route not found» (`ws-api-dispatcher.ts:111`); bad token format →
  `401`, valid format without session → upgrade then close `4001` (`ws-handlers.ts`); frontend
  hardcodes `api/` prefix (`useWebSocketConnection.ts:320`).
- Fixed `backend/request-lifecycle.md` («Event not found» → «Route not found» + link).
- New issues 17–19 added to `docs/plan/code-issues-found-during-docs.md`; item 18 → security-hardening.
- Sidebar + `KEY_PAGES` updated; `pnpm docs:build` + `pnpm docs:verify` — all checks passed.
- Preview: 1 Mermaid SVG, 0 errors; 2 danger + 3 warning blocks; sidebar item active.

**T6.1–T6.3 layers** (`docs/t6-1-3-layers`):

- Pages written from code (3 parallel sub-agents), reviewed in main session; re-checked in code:
  `ValidationError.statusCode = 422` (`validation-error.ts`, handled in `server.ts:345`); services
  importing `db` directly (`push-notification-sender-service.ts`, `push-subscription-statistics-service.ts`);
  N+1 in `findByUserIdWithLogs`; `prompt-controller.ts` calls `fetch` + `throw new Error`;
  `testSentryError` handler exists but is not routed.
- New issues 20–27 in `docs/plan/code-issues-found-during-docs.md`.
- Sidebar + `KEY_PAGES` (12 backend pages); `pnpm docs:build` + `pnpm docs:verify` — all checks passed.
- Preview: 1 Mermaid SVG per page, 0 errors; secret scan clean.

**T6.8b Деплой** (`docs/t6-8b-deployment`, based on `docs/t6-1-3-layers`):

- Real `docker build -t itvibe-docs-check .` — success, ~206 s cold, image 817 MB; real `docker run`
  with `APP_ENV=production` + dummy `APP_KEY`, no DB → `db:create:prod` `ECONNREFUSED 127.0.0.1:5432`,
  exit 1 (documented). Image and container removed afterwards (checked).
- Re-checked in repo: no `.dockerignore`; no `USER`/`HEALTHCHECK`; `CMD ["sh","-c",…]` with
  migrations; `corsS3.xml` `AllowedOrigin *` + `PUT`.
- Fixed a sentence that implied CSP is applied (it is not, item 1).
- New issues 28–32; item 32 → security-hardening.
- `pnpm docs:build` + `pnpm docs:verify` — all checks passed; preview: 1 Mermaid SVG, 0 errors.

**T6.6 Observability** (`docs/t6-6-observability`, based on `docs/t6-8b-deployment`):

- Re-checked in code: pino created without `level` (default `info`), no `LOG_LEVEL`; multistream
  main `trace` + Sentry stream `error`; `handleError` uses the global `logger`; child logger only
  `requestId`; Sentry `tracesSampleRate` from `SENTRY_TRACES_SAMPLE_RATE`, `dataCollection` in
  `sentry-service.ts`; no OpenTelemetry in backend `package.json`.
- New issues 33–35 (requestId in handleError, LOG_LEVEL, readiness check).
- `pnpm docs:build` + `pnpm docs:verify` — all checks passed; preview: 1 Mermaid SVG, 0 errors;
  DSN only as placeholder.

**T6.8a Тестування** (`docs/t6-8a-testing`):

- Real run `pnpm --filter backend test`: 51 files, 268 tests, ~2.2 s (stated on the page).
- Commands on the page executed: `pnpm --filter backend test csrf-guard` → 1 file, 9 tests;
  `pnpm --filter backend test -t …` does NOT filter (pnpm drops the flag) → replaced with
  `pnpm --filter backend exec vitest run -t "422"` → 2 passed, 266 skipped.
- Re-checked: `vitest.config.ts` has no `testTimeout`/`setupFiles`/coverage; only `docs.yml` workflow.
- New issues 36–38.
- Note: #11/#12 had been merged into stacked base branches, not `main`; landed via PR #13.
  Page PRs are now always based on `main` (no stacking).

**T6.7 Кешування та ETag** (`docs/t6-7-caching-etag`):

- Re-checked in code: SHA-1 base64url ETag (`static-server.ts:71`); HTML `public, max-age=0, must-revalidate`;
  other files `max-age=31536000, immutable`; exact `If-None-Match` match; CORS `maxAge: 90`;
  no `Cache-Control` in `sendResponse`; prompt cache `Map` without TTL; `service-worker.js` fixed name.
- Clarified SW update behaviour on the page (`updateViaCache`), so the risk is stated precisely.
- New issues 39–43; item 42 → security-hardening.
- `pnpm docs:build` + `pnpm docs:verify` — all checks passed; preview: Mermaid renders.

## Notes for Next Session

- Pages are written from code; known bugs are referenced from the code-issues file, not fixed here.
