# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-018 - App CI (F01 of `docs/plan/open-issues-roadmap.md`, items 36, 37, 38)
**Branch:** `feat/app-ci`
**Plan:** `docs/plan/app-ci-plan.md`; tasks: `docs/plan/open-issues-tasks.md`, F01

## Status

### Done

- [x] F01.S: PR #54 (feat-010 done, feat-018 `in_progress`, plan); `./init.sh` green
- [x] F01.1: `pnpm run preview` / `pnpm run dev` in `playwright.config.ts`, `pnpm run build-sw` in frontend `build`; Playwright on CI adds a `list` reporter (test names with project in the job log)
- [x] F01.2: backend `testTimeout: 15_000`, `maxWorkers` from `VITEST_MAX_WORKERS`
- [x] F01.3: `.github/workflows/ci.yml`, job `quality`
- [x] F01.4: job `e2e` (frontend build, `playwright install --with-deps`, cache by Playwright version)
- [x] F01.5: `@vitest/coverage-v8` + `test:coverage` in backend and frontend, artifact `coverage`; `coverage/` in `.gitignore`
- [x] F01.6: negative controls (lint, test)
- [x] F01.6a: `*.redis.test.ts` excluded from `pnpm test` by `vitest.config.ts`, `test:redis` only in `redis-tests.yml`
- [x] F01.D: `documentation/backend/testing.md` (Vitest config, coverage, CI table, gaps), `documentation/reference/scripts.md` (`test:coverage`, `pnpm run build-sw`)

### Waiting for the repository owner

- [ ] F01.7: branch protection on `main` — required checks `quality` and `e2e` (Settings → Branches → rule for `main` → Require status checks)

## Evidence of Completion

CI runs on PR #55:

| Run                                                                                  | Commit                         | Result                                                                                                                                                  |
| ------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [40089711640](https://github.com/Blazheiko/itvibe-template/actions/runs/40089711640) | `ci.yml` added                 | first run, no cache (`pnpm cache is not found`, `Cache not found for input keys: playwright-Linux-1.64.1`): `quality` ✅ 2 min 26 s, `e2e` ✅ 2 min 8 s |
| [40089935251](https://github.com/Blazheiko/itvibe-template/actions/runs/40089935251) | TEMP lint error + failing test | `quality` ❌ at `pnpm lint` (negative control)                                                                                                          |
| [40090062773](https://github.com/Blazheiko/itvibe-template/actions/runs/40090062773) | TEMP failing test only         | `quality` ❌ at `pnpm test`: `negative control — AssertionError: expected 1 to be 2`                                                                    |
| [40090215969](https://github.com/Blazheiko/itvibe-template/actions/runs/40090215969) | negative control removed       | `quality` ✅, `e2e` ✅, caches restored (pnpm, `playwright-Linux-1.64.1`)                                                                               |

From the first run log:

- `quality`: backend 671 passed, frontend 45 passed, shared pass 3, documentation pass 26; coverage lines backend 74.11 %, frontend 50.88 %; artifact `coverage` (561 565 bytes); no `redis.test` in the log
- `e2e`: `12 passed (20.7s)`, 3 tests in each project `[chromium]`, `[firefox]`, `[webkit]`, `[Mobile Safari]`

Local (macOS, Node 24.20.0):

- `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm build` — exit 0
- `pnpm test` — backend 671, frontend 45, shared pass 3, documentation pass 26
- `CI=1 pnpm --filter frontend test:e2e` — 12 passed, server started by `pnpm run preview`
- timeout: a temporary 7 s test passes with the new config (would fail at the 5 s default); backend 671 with `VITEST_MAX_WORKERS=2`
- `pnpm docs:build && pnpm docs:verify` — `verify-dist: all checks passed`

## Files Modified

- new: `.github/workflows/ci.yml`, `docs/plan/app-ci-plan.md` (PR #54)
- updated: `packages/frontend/playwright.config.ts`, `packages/frontend/package.json`, `packages/backend/vitest.config.ts`, `packages/backend/package.json`, `pnpm-lock.yaml`, `.gitignore`, `documentation/backend/testing.md`, `documentation/reference/scripts.md`, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`, `progress.md`

## Notes for Next Session

- After F01.7 and merge: done PR for feat-018; next wave-2 feature F19 PG Test Harness (feat-036) or F02 Docker (feat-019).
