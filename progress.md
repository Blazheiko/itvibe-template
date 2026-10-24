# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-024 - WebSocket Cleanup (F07 of `docs/plan/open-issues-roadmap.md`, items 17, 19)
**Branch:** `feat/ws-cleanup`
**Tasks:** `docs/plan/open-issues-tasks.md`, F07

## Status

### Done

- [x] F07.S: PR #72 (feat-023 done, feat-024 `in_progress`)
- [x] F07.1 (item 17): `utils/ws-event.ts` — `normalizeApiPrefix`, `WS_API_PREFIX` from `VITE_API_PATH_PREFIX` (default `api`), `buildWsEvent`; typed in `env.d.ts`, documented in `.env.example`; used by `useWebSocketConnection.websocketApi`
- [x] F07.2 (feat-009 follow-up): the «Request already in progress» check looked up `${timestamp}_${event}` while the request was stored under `event`, so it never fired and a second request for the same event overwrote the first; `hasPendingRequest` checks the same key
- [x] F07.3 (item 19): removed `src/app/state/user-storage.ts` (no importers) and the unreachable «Event not found» branch in `onMessage`; `ws-api-dispatcher` return type is `Promise<WsResponseData>`
- [x] F07.4 (item 19): removed `utils/websocket-base.ts` (637 lines, class unused); types and `buildApiError` moved to `utils/websocket-types.ts`; stale comments in `App.vue`, `base-api.ts`
- [x] F07.5: manual check with `API_PATH_PREFIX=v1` (below)
- [x] F07.D: `documentation/backend/websocket.md`, `documentation/frontend/index.md`, `packages/frontend/README.md`; code-issues 17, 19 fixed, new item 73 (HTTP calls still hard-code `/api/`)

## Evidence of Completion

- RED first: `ws-event.spec.ts` (prefix normalization `undefined`/`''`/`/v1/`/`internal/api`; `api/…`, `v1/…`), `ws-api-response.spec.ts` (`hasPendingRequest`)
- Manual: backend from source with `API_PATH_PREFIX=v1` on a disposable DB, admin session, Node `WebSocket` client → `v1/admin/subscribe_online_users` → `200`, `api/admin/subscribe_online_users` → `not_found`; `VITE_API_PATH_PREFIX=v1 vite build` → the bundle contains the inlined `"v1"`. Redis keys `manual-feat024:*` removed
- Process note: a `prettier --write src` in the frontend touched `.vue`/`.css` files outside the project glob (item 71); those changes were reverted before committing, the diff has only the intended files
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 731, frontend 58, shared pass 3, documentation pass 26; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- new: `packages/frontend/src/utils/{ws-event,websocket-types}.ts`, `packages/frontend/src/utils/__tests__/ws-event.spec.ts`
- removed: `packages/frontend/src/utils/websocket-base.ts`, `packages/backend/src/app/state/user-storage.ts`
- updated: `packages/frontend/src/{composables/useWebSocketConnection,composables/useBroadcastHandler,utils/ws-api-response,utils/base-api,env.d}.ts`, `packages/frontend/src/App.vue`, `packages/frontend/.env.example`, `packages/frontend/src/utils/__tests__/ws-api-response.spec.ts`, `packages/backend/src/vendor/utils/{network/ws-handlers,routing/ws-api-dispatcher}.ts`, docs listed above, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- Next: F10 AI Reliability (feat-027).
