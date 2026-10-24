# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-035 - ESLint Strict (F18 of `docs/plan/open-issues-roadmap.md`, item 68)
**Branch:** `feat/eslint-strict`
**Tasks:** `docs/plan/open-issues-tasks.md`, F18 (three PRs: backend, frontend, api-playground)

## Status

### Done

- [x] F18.S: PR #90 (feat-034 done, feat-035 `in_progress`)
- [x] F18.1 backend (PR 1): the backend override block that switched off 35 rules is gone; backend source runs the full `strictTypeChecked` + project rules. Before: 626 errors in 132 files with the overrides removed

- [x] F18.1 merged: PR #91
- [x] F18.2 frontend (PR 2): `packages/frontend/eslint.config.ts` moves from `vueTsConfigs.recommended` + a 30-rule off-list to `strictTypeChecked` + `stylisticTypeChecked` for `.ts` and `.vue`

### Next

- [ ] F18.3 api-playground (PR 3), F18.X

## Evidence of Completion — PR 1 (backend)

- Rules still off, backend tests only (`*.spec.ts`, `*.test.ts`, `src/test-support/**`), with reasons in `eslint.config.ts`: `explicit-function-return-type`, `no-explicit-any`, `no-empty-function`, `require-await`, `no-non-null-assertion`, `no-dynamic-delete`
- Inline `eslint-disable` with reasons: `require-await` around `staticHandler`/`staticCacheHandler` (a sync throw must become a rejection for the caller's `.catch`), `consistent-type-definitions` on `AppErrorHttpPayload` (needs the implicit index signature of a type alias), `no-unnecessary-type-parameters` on a test helper
- Fixes that matter beyond style: `||` on env strings replaced by `nonEmpty(x) ?? default` (new `vendor/utils/env/non-empty.ts`, same `''`-means-missing behaviour); middleware kernel typed `Record<string, Middleware>` instead of `Function`; `process.on('uncaughtException')` gets a sync wrapper; `switch` over HTTP methods is exhaustive
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` passed (backend 843); `test:redis` with `REDIS_TEST_URL` — 31 passed; `test:pg` with `PG_TEST_URL` — 22 passed; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- `eslint.config.ts`, `documentation/reference/toolchain.md`, `packages/backend/src/**` (58 files, mostly `type` → `interface` autofix and the fixes above)

## Evidence of Completion — PR 2 (frontend)

- Finding: ESLint 10 resolves the nearest `eslint.config.*` per file, so the `packages/frontend/**` block in the root config never applied (frontend files always used the package config). The dead block is removed; the root `packages/api-playground/**` block is dead the same way (PR 3)
- `configureVueProject({ rootDir: __dirname })`: without it the type-aware presets crash under the root `eslint .` (`await-thenable ... requires type information` on a template-only `.vue`), because they scan `.vue` files from the cwd
- Before fixes: 138 errors (after autofix). Relaxed with reasons in the config: `restrict-template-expressions` `allowNumber`, `prefer-nullish-coalescing` `ignorePrimitives.string`; tests: `no-empty-function`, `no-non-null-assertion`. Inline disables with reasons: three runtime feature checks in `service-worker.ts` / `state.ts` (`crypto.randomUUID`, `clients.openWindow`, `document.body`), one JSON check in `service-worker.ts`
- Not applied to the frontend: root project rules (`explicit-function-return-type`, `strict-boolean-expressions`, …) — out of the `strictTypeChecked` scope of item 68
- Behaviour-relevant fixes: floating `router.push`/`replace` marked `void`; async mitt/DOM handlers wrapped (`onInitAppEvent`, `onUnauthorizedEvent`, `onBeforeInstallPrompt`, SW `load`); WS message validation takes `unknown`; pending maps typed `Partial<Record>`; `userStore.user!` replaced by a null check; mitt no-payload events typed `undefined` instead of `void`
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` (backend 843, frontend 58, api-playground 11, shared, documentation) passed; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed
- Not run: `test:e2e:csp` (not in CI; its config uses port 3000, taken by another local process)
