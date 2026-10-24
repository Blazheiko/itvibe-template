# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-020 - HTTP/WS Response Safety (F03 of `docs/plan/open-issues-roadmap.md`, items 18, 42)
**Branch:** `feat/response-safety`
**Tasks:** `docs/plan/open-issues-tasks.md`, F03

## Status

### Done

- [x] F03.S: PR #68 (feat-019 done, feat-020 `in_progress`)
- [x] F03.1 (item 18): `handleUpgrade` answers `401 Session expired` before `res.upgrade` when `onUpgrade` returns `missing`. **Needed a frontend change:** the browser reports a refused upgrade as close `1006` without `open`, while the frontend refreshed the WS token only on `4001`, so it would have retried the stale token every 5 s forever. New pure `resolveWebSocketCloseAction` (`packages/frontend/src/utils/websocket-close.ts`): 4001 or a handshake that never opened → refresh the token (first time at once, then every 5 s, so an unreachable WS endpoint with a working HTTP API does not loop); used by `useWebSocketConnection.ts`
- [x] F03.2 (item 42): `setApiCacheHeader` → `Cache-Control: no-store` on every API response (`sendResponse`, `sendErrorResponse`) unless the controller set its own `Cache-Control`; static untouched
- [x] F03.D: `documentation/backend/{websocket,auth-security,caching-etag}.md`; code-issues 18, 42 fixed

## Evidence of Completion

- RED first: `ws-redis-unavailable.spec.ts` (`missing` → `['cork', '401 Unauthorized', 'end']`, no `upgrade`; live session upgrades); `http-cache-control.spec.ts` (200, 204, 201, 403, cookie, thrown 500 → `no-store`; controller `Cache-Control` in any case kept) — 7 failing first; `ws-upgrade-shared-disabled.spec.ts` used `missing` only as a stub to reach the upgrade, switched to a live session
- frontend `websocket-close.spec.ts` — 4001, first/next handshake failures, dropped open connection, 4000–4099
- e2e `mobile-layout.spec.ts` «support input»: the fake socket never opens → the test now mocks `update-ws-token` (before, the unmocked call went through the Vite proxy to whatever listens on `127.0.0.1:3000` — locally another app answered 401 and the test signed the user out) and asserts ≤ 2 token refreshes in 3 s. Negative control without the delay: `Received: 28`
- Manual (backend from source on 3999, disposable DB, `SERVE_STATIC=false`; Redis keys `manual-feat020:*` removed): `/api/ping`, `/api/main/init`, 404, login → `Cache-Control: no-store`; upgrade with a well-formed unknown 16-char token → `401 Session expired`, Node `WebSocket` client sees `{"opened":false,"code":1006}`; logged-in user's token → opened, closed 1000
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 715, frontend 50, shared pass 3, documentation pass 26; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- new: `packages/backend/src/vendor/start/http-cache-control.spec.ts`, `packages/frontend/src/utils/websocket-close.ts` (+ spec)
- updated: `packages/backend/src/vendor/utils/network/{ws-handlers,http-response-handlers}.ts`, `packages/backend/src/vendor/start/server.ts`, specs `ws-redis-unavailable`, `ws-upgrade-shared-disabled`; `packages/frontend/src/composables/useWebSocketConnection.ts`, `packages/frontend/e2e/mobile-layout.spec.ts`; docs listed above; `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- Next: F06 Storage Hardening (feat-023).
