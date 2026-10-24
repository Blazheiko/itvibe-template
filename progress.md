# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-033 - Frontend & Playground (F16 of `docs/plan/open-issues-roadmap.md`, items 59, 61, 62, 63, 64)
**Branch:** `feat/frontend-playground`
**Tasks:** `docs/plan/open-issues-tasks.md`, F16

## Status

### Done

- [x] F16.S: PR #86 (feat-032 done, feat-033 `in_progress`)
- [x] F16.1 (item 59): `base-api.ts` falls back to `''` (same origin) instead of the example domain; `.env.example` has an empty `VITE_BASE_URL`
- [x] F16.2 (item 61): `env.d.ts` types every `VITE_*` the app reads; dead push code and the wrong "every minute" comment removed from `main.ts`
- [x] F16.3 (item 62): `utils/api-path.ts` — `apiUrl(baseUrl, path)` under `VITE_API_PATH_PREFIX` (default `api`); the dev proxy uses the same variable
- [x] F16.4 (item 63): `toWsUrl`: `https` → `wss`, `http` → `ws`
- [x] F16.5 (item 64, R4): `sendMessage` without a connection logs `WebSocket is not connected: message not sent` and returns `false`; no queue
- [x] F16.6: Test Connection calls `/<prefix>/ping` instead of the missing `/health`
- [x] Playground tests: `test` script, Vitest, `tsconfig.vitest.json`, `vitest.config.ts` with a package-local `fsModuleCachePath` (the workspace-root cache raced with frontend under `pnpm test`: `ENOTEMPTY ... .vitest-cache`)
- [x] F16.D: `documentation/frontend/index.md`, `documentation/playground/index.md`; code-issues 59, 61–64 fixed

## Evidence of Completion

- `pnpm --filter api-playground test` — 11 passed
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` passed 3 runs in a row (backend 843, frontend 58, api-playground 11, shared, documentation); `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed
- bundles: no `itvibe-template.example` in the frontend build, no hard-coded `/api/doc/routes` or `/health` in the playground build
- not met: a typecheck error on an undeclared `VITE_*` — `vite/client` declares an index signature on `ImportMetaEnv`
- not done: manual playground check against a live backend (port 3000 is taken by another local process)

## Files Modified

- new: `packages/api-playground/src/utils/api-path.ts`, `src/utils/__tests__/api-path.spec.ts`, `src/composables/__tests__/useWebSocketConnection.spec.ts`, `tsconfig.vitest.json`, `vitest.config.ts`
- updated: playground `stores/api-doc.ts`, `utils/base-api.ts`, `components/api/TestFormWs.vue`, `composables/useWebSocketConnection.ts`, `vite.config.ts`, `env.d.ts`, `.env.example`, `package.json`, `tsconfig.json`; frontend `utils/base-api.ts`, `env.d.ts`, `main.ts`, `.env.example`; docs

## Notes for Next Session

- F17 (feat-034): drop `users.is_admin` (R5)
