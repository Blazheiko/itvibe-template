# Session Progress Log

## Current State

**Last Updated:** 2026-10-22
**Active Feature:** feat-008 - HTTP Body Fixes (items 12, 13, 14 of `docs/plan/code-issues-found-during-docs.md`)
**Branch:** `feat/http-body-fixes`

Item 12 is done per `docs/plan/http-body-methods-plan.md`. Items 13 (`sendResponse` with `payload === null`) and 14 (body-limit gaps) are not started.

## Status

### Done

- [x] PR #45: feat-008 → `in_progress`
- [x] Item 12: methods with a body and routes with a `validator`
  - `patch` reads and validates the body (`BODY_METHODS` in `src/vendor/utils/routing/body-methods.ts`)
  - body `validator` on `get`/`delete`/`del` is a type error in `defineRoute` and a startup error in `routesHandler`; WS routes are not affected
  - route with a `validator`, no `Content-Type`: no body framing → validated as `{}` (422 or success, defaults applied); `Transfer-Encoding` or `Content-Length` ≠ `0` → 415 before reading, `receivedContentType: null` (was 500 from `getTypedPayload`)
  - `UnsupportedMediaTypeError` accepts `receivedContentType: string | null`
  - docs: `backend/request-lifecycle.md` (step 3, body order, new section «Запит без Content-Type», 415 details, octet limit), `backend/routing-middlewares.md` (new «Методи і тіло запиту»), `backend/validation.md`, `backend/adding-a-feature.md`; item 12 marked fixed

### Not started

- [ ] Item 13: `sendResponse` with `payload === null`
- [ ] Item 14: body-limit gaps (tests, `.env.example`, playground, defaults)

## Files Modified

- new: `packages/backend/src/vendor/utils/routing/body-methods.ts`, `src/vendor/start/http-body-methods.spec.ts`, `docs/plan/http-body-methods-plan.md`
- `packages/backend/src/vendor/start/server.ts`, `src/vendor/start/router.ts`, `src/app/routing/define-route.ts`, `src/vendor/utils/network/errors/unsupported-media-type-error.ts`
- tests: `src/vendor/start/router.spec.ts`, `src/app/routing/define-route.spec.ts`
- `documentation/backend/{request-lifecycle,routing-middlewares,validation,adding-a-feature}.md`, `docs/plan/code-issues-found-during-docs.md`

## Evidence of Completion (item 12)

- `pnpm typecheck`, `pnpm lint` clean
- `pnpm test`: backend 580 (+16), frontend 45, shared 3, documentation 26
- `pnpm docs:build && pnpm docs:verify`: all checks passed; anchors `#методи-і-тіло-запиту`, `#запит-без-content-type` exist
- `http-body-methods.spec.ts` goes through the handler registered with the fake uWS app (real `collectRequestMetadata`, `onData`). Negative control: with `server.ts` from `main` 7 of 8 tests fail (the one that passes checks unchanged behaviour)
- `@ts-expect-error` on `defineRoute` with `validator` for `get`, `delete`, `del`
- Manual (backend on :3000, temporary routes not committed):
  - `curl -X POST /api/auth/login` → 422 with field messages
  - `curl -X POST -H 'Content-Type:' -d '{"email":"a@b.c"}' /api/auth/login` → 415, `receivedContentType: null`
  - `curl -X POST -H 'Content-Type:' -H 'Transfer-Encoding: chunked' --data-binary ''` → 415
  - temporary `patch` route with `LoginInputSchema`: valid body → 200 with the payload, invalid → 422
  - temporary `delete` route with a `validator` → startup fails: `Route DELETE /auth/zz-delete declares a body validator…`, exit 1
- Review follow-up: `Content-Length: 00` / ` 000 ` count as zero bytes (`/^0+$/`), malformed values still count as a body; +3 tests (negative control: `00` and ` 000 ` fail on the old helper). `defineRoute` `method` narrowed to `HttpRouteMethod` (no `ws`/`options`), `@ts-expect-error` tests. Backend 584 tests
- Not formatted by Prettier on purpose: `server.ts` and `define-route.ts` were already unformatted on `main` (item 16)

## Notes for Next Session

- Merge PR #45, then items 13 and 14 on this branch, then PR `feat/http-body-fixes` → `main`.
- Out of scope: `validator` contract for `octet` routes; moving partial-update `put` routes to `patch`; `getTypedPayload` throwing a plain `Error`.
