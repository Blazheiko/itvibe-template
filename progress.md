# Session Progress Log

## Current State

**Last Updated:** 2026-10-21
**Active Feature:** feat-015 - Backend Console To Pino (done in PR #35)
**Branch:** `fix/backend-console-to-pino`

Goal: runtime `console.error` in the backend goes through pino; a malformed JSON body is a client error (`400 bad_request`, `warn`, no body in logs or Sentry) instead of `500` + `logger.error`.

## Status

### Done

- [x] `server.ts`: WS close handler and server stop errors → `logger.error({ err }, …)`; unused `node:console` import removed
- [x] `index.ts`: `console.log("start")` removed
- [x] `readJson` → `MalformedBodyError` (closed `MalformedBodyKind`, no `cause`, no parser text) → `handleError` 400 + `warn { bodyKind }`
- [x] Docs: `request-lifecycle.md` (400 row, parsing), `observability.md` (table and flow diagram)
- [x] Review fixes: 400 branch in the observability diagram, closed type for the body kind, this evidence

### Kept on purpose

- `console.*` in startup/fatal-shutdown paths of `index.ts`, logger and Sentry initialisation (pino may be unavailable there), `create-database.ts` CLI script

## Files Modified

- `packages/backend/src/vendor/utils/network/errors/malformed-body-error.ts` (new)
- `packages/backend/src/vendor/utils/network/http-request-handlers.ts`
- `packages/backend/src/vendor/start/server.ts`
- `packages/backend/src/index.ts`
- `packages/backend/src/vendor/utils/network/malformed-body.spec.ts` (new)
- `documentation/backend/request-lifecycle.md`, `documentation/backend/observability.md`
- `feature_list.json` (feat-015)

## Evidence of Completion

- `malformed-body.spec.ts`: four malformed or non-object bodies (`"secret`, `secret`, `{"password":"secret" x`, `["secret"]`) → `MalformedBodyError`; the secret appears in neither the message, the serialized error nor a `cause`; `handleError` answers `400 bad_request`, calls `logger.warn({ bodyKind: "json" }, …)` and never `logger.error`
- `pnpm --filter backend test`: 471/471
- `pnpm typecheck`, `pnpm lint` clean
- `pnpm docs:build && pnpm docs:verify`: all checks passed
- Not tested: a real request with a malformed body against a running server (covered by the unit test through `getData` and `handleError`)
