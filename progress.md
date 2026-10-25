# Session Progress Log

## Current State

**Last Updated:** 2026-10-25
**Active Feature:** feat-038 - Format, Push Events, HTTP Prefix (code-issues items 71, 72, 73)
**Branch:** `feat/format-push-prefix` (three PRs: 73, 72, 71)

## Status

### Done

- [x] Start: PR #98
- [x] Item 73 (PR 1): `utils/api-path.ts` (`API_PREFIX`, `apiPath()`); all 46 paths in `api.ts`, OAuth links, screenshot and storage URLs, the service-worker API filter and the Vite proxy key (`/<prefix>` with `ws: true`, the `/ws` rule removed) follow `VITE_API_PATH_PREFIX`; `ws-event.ts` uses the same prefix; leftover `itvibe-template.example` fallback in `stores/state.ts` removed

### Next

- [ ] Item 72: push on new sign-in, password changed / reset / logout-all (`system`), support reply (`mention`, `skipIfOnline`)
- [ ] Item 71: format glob + one formatting commit in `.git-blame-ignore-revs`

## Evidence — PR 1 (item 73)

- `api-path.spec.ts`: with `VITE_API_PATH_PREFIX=v1` `authApi.login` calls `POST /v1/auth/login`
- built bundle: the only `/api/` left is the Sentry SDK envelope URL
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` passed; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed
