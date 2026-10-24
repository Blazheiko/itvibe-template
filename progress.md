# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-026 - Validation Cleanup (F09 of `docs/plan/open-issues-roadmap.md`, items 26, 27)
**Branch:** `feat/validation-cleanup`
**Tasks:** `docs/plan/open-issues-tasks.md`, F09

## Status

### Done

- [x] F09.S: PR #64 (feat-025 done, feat-026 `in_progress`); `./init.sh` green
- [x] F09.1 (item 26): `ValidationResult` failure may carry `issues: ValidationIssue[]` (`{ path, message }`); `arkValidator` maps every `ArkError` (`path` = `propString`, `''` for the root); `ValidationError.issues`; `details.issues` in HTTP 422 (`server.ts`) and both WS validation errors (`ws-api-dispatcher.ts`, envelope in `ws-handlers.ts`); `ValidationIssue` + `ValidationErrorDetails.issues` in `shared`. **Changed from the roadmap:** `messages` stays `string[]` (now one line per problem instead of one `summary`) because the frontend reads `details.messages` (`response-normalizer.ts`); the objects go to the new `issues`
- [x] F09.2 (item 27): removed `app/validate/schemas/schemas.ts` and its commented imports in `src/index.ts`, `vendor/start/server.ts`; removed the unregistered `MainController.testSentryError` (`observability.md` now explains how to check Sentry without it)
- [x] F09.3 (item 27): `ValidationError` docstring no longer says ArkType; `nativeValidator` → `bodySchema` in `serialize-routes.ts`; backend README already says `422` (fixed in feat-009)
- [x] F09.4 (item 27): ADR 0001 — §3.6, §9, §5.6 recorded as «не робимо» with reasons
- [x] F09.D: `documentation/backend/validation.md` (contract, adapter, 422 example with `issues`, WS), `documentation/backend/observability.md`; code-issues 26, 27 fixed

## Evidence of Completion

- RED first: `arktype-adapter.spec.ts` (4 fields incl. nested `nested.name` and rejected `extra`; root-level path `''`), `server.spec.ts` (`details.issues` in the 422 body), `ws-validation.spec.ts` (`details.messages` + `details.issues` for an invalid WS payload) — 4 failing, then green
- Manual (backend from source on 3999, disposable DB; Redis keys `manual-feat026:*` removed): `POST /api/auth/register/email` with 4 bad fields → 422, `messages` and `issues` with paths `email`, `name`, `password`, `extra`; `POST /api/auth/login` (union schema) → one root issue `path: ''` — ArkType reports a union failure as a whole
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 706, frontend 45, shared pass 3, documentation pass 26; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- removed: `packages/backend/src/app/validate/schemas/schemas.ts`
- updated: `packages/backend/src/vendor/contracts/validator.ts`, `packages/backend/src/app/validate/{adapters/arktype-adapter.ts,errors/validation-error.ts}`, `packages/backend/src/vendor/utils/validation/validate-route-payload.ts`, `packages/backend/src/vendor/start/server.ts`, `packages/backend/src/vendor/utils/routing/{ws-api-dispatcher,serialize-routes}.ts`, `packages/backend/src/vendor/utils/network/ws-handlers.ts`, `packages/backend/src/index.ts`, `packages/backend/src/app/controllers/http/core/main-controller.ts`, `packages/shared/src/errors/error-codes.ts`, specs (`arktype-adapter`, `server`, `ws-validation`), `documentation/backend/{validation,observability}.md`, `docs/adr/0001-validator-abstraction.md`, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- Next: F02 Docker (feat-019), F03 (feat-020), F06 (feat-023), F07 (feat-024), F10 (feat-027) …
