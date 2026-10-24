# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-027 - AI Reliability (F10 of `docs/plan/open-issues-roadmap.md`, items 23, 50, 51)
**Branch:** `feat/ai-reliability`
**Plan:** `docs/plan/ai-reliability-plan.md`; tasks: `docs/plan/open-issues-tasks.md`, F10

## Status

### Done

- [x] F10.S: PR #74 (feat-024 done, feat-027 `in_progress`, plan)
- [x] F10.1 (item 50): `AI_TEXT_DRIVER` ∈ {openai, xai, mistral}, else `configError` → `validateRuntimeConfig()` stops the start
- [x] F10.2 (item 51): `AI_REQUEST_TIMEOUT_MS` (default 60 000, integer ≥ 1000); `aiRequestSignal(signal?)` = timeout + caller; `aiAbortKind(error)` walks the cause chain
- [x] F10.3 (item 51): signal in every adapter — OpenAI `fetch` (one deadline for the call incl. the tool round-trip), xAI `abortSignal`, Mistral `fetchOptions.signal`, embeddings `{ signal }`
- [x] F10.4 (item 51): `HttpContext.signal` (`AbortController` fired by the existing `res.onAborted`), `WsContext.signal` (per-connection signal, `vendor/utils/network/ws-connection-signal.ts`, aborted first thing in `onClose`); Support AI `openChat`/`chat` forward it, an abort is logged as info and sends no `support_chat_error`
- [x] F10.5 (item 23): `promptTestService.run` via `textAdapter` only; new `AppError` `UpstreamError` (502 `upstream_error`) and `UpstreamTimeout` (504 `upstream_timeout`) + `shared` `ErrorCode`; unconfigured provider → 503; `prompt-controller` has no `fetch`, no `throw new Error`
- [x] F10.D: `documentation/backend/{ai,configuration,controllers-services,request-lifecycle}.md`, `packages/backend/.env.example`; code-issues 23, 50, 51 fixed. Also fixed an import order slip from feat-025 in `prompt-service.ts` and removed the stale «тонкий контролер» warning (both items it listed are fixed)

## Evidence of Completion

- RED first: `config/ai.spec.ts` (11), `prompt-test-service.spec.ts`, then `ai-request-signal.spec.ts`, `adapters/adapter-signal.spec.ts` (OpenAI hangs → `TimeoutError` after 50 ms; caller abort → `AbortError`; xAI/Mistral/embeddings get a live signal), `ws-connection-signal.spec.ts`, `support-service.spec.ts` (signal forwarded; abort → no error event while tokens were streamed), `prompt-controller.spec.ts` (signal passed; 504/502 mapping); `http-response-handlers.spec.ts` now expects 502 `upstream_error`, 504 `upstream_timeout`
- Manual (backend from source, disposable DB, admin, fake LLM HTTP server on 127.0.0.1:59998; Redis keys `manual-feat027:*` removed):
    - `AI_TEXT_DRIVER=foo` → `Failed to start application: Error: Invalid AI configuration: AI_TEXT_DRIVER must be one of openai, xai, mistral, got "foo"`
    - provider never answers, `AI_REQUEST_TIMEOUT_MS=1500` → `POST /api/prompts/SUPPORT_SYSTEM/test` → `504 upstream_timeout` in 1.57 s
    - provider answers 500 with `secret provider detail` → `502 upstream_error` «AI provider error»; the detail only in the server log
    - timeout 60 s, client gives up after 1 s (`curl -m 1`) → the fake provider logs `provider connection closed after 997 ms`
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 763, frontend 58, shared pass 3, documentation pass 26; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- new: `packages/backend/src/app/services/ai/{ai-request-signal,prompt-test-service}.ts` (+ specs), `packages/backend/src/app/services/ai/adapters/adapter-signal.spec.ts`, `packages/backend/src/vendor/utils/network/ws-connection-signal.ts` (+ spec), `packages/backend/src/config/ai.spec.ts`, `packages/backend/src/app/controllers/http/ai/prompt-controller.spec.ts`
- updated: `packages/backend/src/config/ai.ts`, `src/app/start/validate-runtime-config.ts`, `src/app/services/ai/{ai-provider,types,prompt-service}.ts`, the four adapters, `src/app/services/shared/errors.ts`, `src/app/services/support/{support-service,support-llm-service}.ts` (+ spec), `src/app/controllers/{http/ai/prompt-controller,ws/support-controller}.ts`, `src/vendor/types/types.d.ts`, `src/vendor/utils/context/{http,ws}-context.ts`, `src/vendor/start/server.ts`, `src/vendor/utils/network/{ws-handlers,http-response-handlers}.ts` (+ spec), `packages/shared/src/errors/error-codes.ts`, `packages/backend/.env.example`, docs listed above, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- Next: F11 AI Usage Accounting (feat-028, depends on feat-027).
