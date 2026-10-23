# Session Progress Log

## Current State

**Last Updated:** 2026-10-22
**Active Feature:** feat-008 - HTTP Body Fixes (items 12, 13, 14 of `docs/plan/code-issues-found-during-docs.md`)
**Branch:** `feat/http-body-fixes`

Item 12 is done per `docs/plan/http-body-methods-plan.md`. Items 12, 13 and 14 are done per `docs/plan/http-body-methods-plan.md`, `http-null-payload-plan.md`, `http-body-limits-plan.md`. Next: PR `feat/http-body-fixes` → `main`.

## Status

### Done

- [x] PR #45: feat-008 → `in_progress`
- [x] Item 12: methods with a body and routes with a `validator`
  - `patch` reads and validates the body (`BODY_METHODS` in `src/vendor/utils/routing/body-methods.ts`)
  - body `validator` on `get`/`delete`/`del` is a type error in `defineRoute` and a startup error in `routesHandler`; WS routes are not affected
  - route with a `validator`, no `Content-Type`: no body framing → validated as `{}` (422 or success, defaults applied); `Transfer-Encoding` or `Content-Length` ≠ `0` → 415 before reading, `receivedContentType: null` (was 500 from `getTypedPayload`)
  - `UnsupportedMediaTypeError` accepts `receivedContentType: string | null`
  - docs: `backend/request-lifecycle.md` (step 3, body order, new section «Запит без Content-Type», 415 details, octet limit), `backend/routing-middlewares.md` (new «Методи і тіло запиту»), `backend/validation.md`, `backend/adding-a-feature.md`; item 12 marked fixed

- [x] Item 13: response with an empty payload (`sendResponse`)
  - `null`/`undefined` in 200 → 204; other 2xx keep the status without a body; 204/205/3xx never have a body
  - no `Content-Type` without a body, including one from `responseData.headers` (case-insensitive); controller `Content-Length` is skipped too (review of `74b784c`)
  - 204 and 304 end via `res.endWithoutBody()`: no `Content-Length` (RFC 9110 §8.6)
  - 4xx/5xx with an empty payload → `{ status: "error", code, message }`, `code` from shared `ErrorCode` (`buildStatusErrorBody` in `http-response-handlers.ts`)
  - docs: `backend/request-lifecycle.md` (step 8, new «Відповідь без даних»), `backend/adding-a-feature.md`; item 13 marked fixed

- [x] Item 14: body-limit gaps
  - `parseSize` accepts only a positive safe integer of bytes (digits, surrounding whitespace allowed); `Infinity`, `1.5`, `1e6`, `0x10` → default (behaviour change)
  - tests: `config/app.spec.ts` (real config, env restored), `http-request-handlers.spec.ts` (`detectBodyKind`, `resolveMaxBodySize` with mocked config), `http-body-limits.spec.ts` (registered handler, small limits), `http-body-limits.transport.spec.ts` (real uWS, raw socket)
  - `serializeRoutes` adds `bodyLimits: [{ kind, maxBytes }]` to post/put/patch routes; playground shows it (`ApiRoute.vue`, `formatBytes`), "No additional details" condition updated
  - defaults 2 / 50 / 50 / 2 MiB kept and documented; `.env.example` was already done in feat-006
  - docs: `backend/request-lifecycle.md`, `backend/configuration.md` (why the defaults, proxy, memory estimate), `playground/index.md`, note in `src/docs/HTTP_BODY_LIMITS_PLAN.md`; item 14 marked fixed

## Files Modified

- item 14: `src/config/app.ts` (+ new `app.spec.ts`), `src/vendor/utils/routing/serialize-routes.ts` (+spec), new `src/vendor/utils/network/http-request-handlers.spec.ts`, `src/vendor/start/http-body-limits{,.transport}.spec.ts`, `packages/api-playground/src/{stores/api-doc.ts,utils/api-helpers.ts,components/api/ApiRoute.vue}`, `documentation/backend/{request-lifecycle,configuration}.md`, `documentation/playground/index.md`, `src/docs/HTTP_BODY_LIMITS_PLAN.md`
- item 13: `src/vendor/start/server.ts` (`sendResponse`), `src/vendor/utils/network/http-response-handlers.ts` (+spec), new `src/vendor/start/http-empty-payload.spec.ts`, `docs/plan/http-null-payload-plan.md`, `documentation/backend/{request-lifecycle,adding-a-feature}.md`
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

## Evidence of Completion (item 13)

- `pnpm typecheck`, `pnpm lint` clean; backend 620 tests (+36: 22 in `http-empty-payload.spec.ts`, 14 in `http-response-handlers.spec.ts`)
- `pnpm docs:build && pnpm docs:verify`: all checks passed; anchor `#відповідь-без-даних` exists
- `http-empty-payload.spec.ts` goes through the registered handler and the real `sendResponse`. Negative control: with `server.ts` and `http-response-handlers.ts` from `HEAD` all 15 new-behaviour tests fail, the 5 regression tests pass
- Audit: `null` removed from `HandlerReturn` temporarily → `tsc` clean outside specs, so no live route changes its response
- Manual (backend on :3917, because :3000 is held by another local app; temporary routes not committed), `curl -i`:
  - handler returns `null` → `204 No Content`, no `Content-Type`, no `Content-Length`, no body
  - handler without `return` → same
  - `status = 202`, `null` → `202 Accepted`, `Content-Length: 0`, no `Content-Type`
  - `status = 403`, `null` → 403, `{"status":"error","code":"forbidden","message":"Forbidden"}`
  - `GET /api/ping` → 200 `{"status":"ok"}` as before
  - `curl -v` 204 then `/api/ping` on one connection → connection re-used

## Evidence of Completion (item 14)

- `pnpm typecheck`, `pnpm lint` clean; `pnpm test`: backend 671 (+51), frontend 45; `pnpm --filter api-playground build` OK
- `pnpm docs:build && pnpm docs:verify`: all checks passed
- Negative controls on `http-body-limits.spec.ts`: `resolveMaxBodySize` → always `maxBodySize` makes 12 of 13 fail; `totalSize >= limit` in `readData` makes the 4 "exactly the limit" tests fail. `config/app.spec.ts` on the old `parseSize`: `1.5`, `1e6`, `Infinity`, `9007199254740993`, `0x10` fail
- Real uWS (`http-body-limits.transport.spec.ts`): only headers with oversized `Content-Length` → full 413 (status, headers, JSON body); chunked over the limit on a non-final chunk, no terminating chunk → full 413. No change to `readData` was needed
- Manual (backend on :3917; :3000 is another local app):
  - 3 MB JSON object to `POST /api/auth/login` → 413, `limit: 2097152`
  - `Content-Length: 99999999` with a 2-byte body → 413 in ~1 ms (early rejection)
  - 3 MB via `Transfer-Encoding: chunked` → 413
  - normal small body → reaches validation (422 from the login schema), as before
  - `GET /api/doc/routes` (`APP_ENV=manual-test`, `DOC_PAGE=true`): `post auth/login` → `[{json, 2097152}]`, `post avatar/upload` and knowledge-base screenshot → `[{multipart, 52428800}]`, `get`/`delete` → no field
- Not done: visual check of the playground card in a browser (build and JSON checked only)

## Notes for Next Session

- Open PR `feat/http-body-fixes` → `main`, then a done PR for feat-008.
- Optional: look at the playground card in a browser (`pnpm --filter api-playground dev` against a backend with `APP_ENV=manual-test`).
- Out of scope: `validator` contract for `octet` routes; moving partial-update `put` routes to `patch`; `getTypedPayload` throwing a plain `Error`.
