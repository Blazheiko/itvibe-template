# Session Progress Log

## Current State

**Last Updated:** 2026-10-25
**Active Feature:** feat-037 - Review Fixes (post-plan review of `0655aca..main`)
**Branch:** `feat/review-fixes`

## Status

### Done

- [x] Start: PR #95 (feat-037 `in_progress`, feat-026 `owner`/`branch` filled in)
- [x] High — WS responses under a non-`api` prefix were dropped (frontend and playground dispatched only `startsWith('api')`): `classifyWsMessage(event, isPending)` recognises an API response by its pending request; unit with prefix `v1` in both packages
- [x] High — xAI adapter swallowed abort/timeout: the AI SDK `abort` part now throws `abortSignal.reason` (`TimeoutError` / `AbortError`), an `error` part throws, a `usage` rejection after abort is rethrown (otherwise `warn`)
- [x] Medium — `sendToUser`: expired subscriptions are deactivated after the log write, each in its own try/catch; a failed deactivation no longer loses the logs
- [x] Medium — static stream: a file that got shorter than at startup closes the response (`warn`) instead of hanging; handles the last chunk waiting for `onWritable`
- [x] Medium — `304` carries `Vary: Accept-Encoding` like the `200`
- [x] Medium — adapter tests: real timeout and caller-abort tests for xAI (SDK-like `abort` part), Mistral and embeddings
- [x] Medium — `ViteTypeOptions.strictImportMetaEnv` in both `env.d.ts`: an undeclared `VITE_*` is `TS2339`
- [x] Low: `sum(...)::bigint` in usage stats; prompt-test client abort logged at `info`; prompt cache: a refresh started before `update()` keeps the fresh row; `pg-global-setup` drops the database when connect/migrate fails; `fileURLToPath` for the migrations folder; `VITEST_MAX_WORKERS=50%` passed as is; playground proxy `ws: true` on `/<prefix>` (the `/ws` rule pointed nowhere); embedding batch writes a summary to `final_prompt`; `LlmTextUsageFeature` includes `SUPPORT_EMBEDDING`; docs (`deployment.md` `/api/ready`, `observability.md` contradiction, playground proxy, caching 304/truncation, ai.md xAI abort); frontend ESLint duplicate `i18n.d.ts` block removed, `vite.sw.config.ts` linted (added to `tsconfig.node.json`) instead of ignored
- [x] AC text synced in `open-issues-tasks.md` for F04.2, F06.2, F07.5, F08.6, F09.1, F10.3, F12.1, F13.4, F14.4, F16.2, F16.6

## Evidence of Completion

- Negative controls: without the xAI fix 3 new adapter tests fail (`TimeoutError`/`AbortError`/error part); without the static fix the truncation test hangs (3 s timeout) and the 304 `Vary` test fails; without the prompt fix the refresh race test fails; an undeclared `VITE_DOES_NOT_EXIST` gives `TS2339`
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 850, frontend 61, api-playground 14, shared, documentation passed; `test:redis` 31, `test:pg` 22 passed; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed
- Not done: manual run with backend `API_PATH_PREFIX=v1` (port 3000 busy locally); covered by the `v1` unit tests
