# Session Progress Log

## Current State

**Last Updated:** 2026-10-25
**Active Feature:** feat-038 - Format, Push Events, HTTP Prefix (code-issues items 71, 72, 73)
**Branch:** `feat/format-push-prefix` (three PRs: 73, 72, 71)

## Status

### Done

- [x] Start: PR #98
- [x] Item 73 (PR 1): `utils/api-path.ts` (`API_PREFIX`, `apiPath()`); all 46 paths in `api.ts`, OAuth links, screenshot and storage URLs, the service-worker API filter and the Vite proxy key (`/<prefix>` with `ws: true`, the `/ws` rule removed) follow `VITE_API_PATH_PREFIX`; `ws-event.ts` uses the same prefix; leftover `itvibe-template.example` fallback in `stores/state.ts` removed
- [x] Item 73 merged: PR #99
- [x] Item 72 (PR 2): `user-notification-service.ts` — `security(userId, event)` (`system`, every device) on successful login, OAuth callback, change password, both password resets, logout-all; `supportReply(userId)` (`mention`, `skipIfOnline`) after the support answer is saved; fire-and-forget with `warn` on failure
- [x] Item 72 merged: PR #100
- [x] Item 71 (PR 3): root `format`/`format:check` glob `**/*.{ts,tsx,js,mjs,vue,json,md,css}`; formatting-only commit `dd9db8b` (60 files: frontend 29, api-playground 27, shared 4) listed in `.git-blame-ignore-revs`; package `format` scripts stay on `src/` (run from the package they would read that package's ignore files, not the root `.prettierignore`), docs point to the root `pnpm format`

### Next

- (none: feat-038 complete after PR 3 merges)

## Evidence — PR 1 (item 73)

- `api-path.spec.ts`: with `VITE_API_PATH_PREFIX=v1` `authApi.login` calls `POST /v1/auth/login`
- built bundle: the only `/api/` left is the Sentry SDK envelope URL
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` passed; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Evidence — PR 2 (item 72)

- `user-notification-service.spec.ts`: each security event → `system` without `skipIfOnline`; support reply → `mention` + `skipIfOnline`; a rejected push is logged, not thrown
- `auth-service.spec.ts`: successful login → `new_sign_in`; failed session → no push; logout-all → `logout_all`
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` passed (backend 857); `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed
- Not done: a real push to a browser (needs VAPID keys and a subscribed browser)

## Evidence — PR 3 (item 71)

- `dd9db8b` is formatting only: after it `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` and `pnpm --filter frontend test:e2e` (12) pass unchanged
- `pnpm format:check` with the new glob passes; `pnpm docs:build && pnpm docs:verify` — passed
