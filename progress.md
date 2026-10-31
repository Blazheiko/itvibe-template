# Session Progress Log

## Current State

**Last Updated:** 2026-10-31
**Active Feature:** feat-049 - Validate Async WS Messages
**Branch:** `feat/ws-async-message-validation` (based on `docs/feat-049-plan`, PR #165)
**Plan:** `docs/plan/ws-async-message-validation-plan.md`, tasks: `docs/plan/ws-async-message-validation-tasks.md`

## Status

### Done

- [x] 0.1: PR #165 (plan, task list, feat-049 → `in_progress`, §6 decisions recorded). Not merged
- [x] 0.4: `broadcastService.*` callers — `support-service.ts` (3 support events), `ws-presence-service.ts` (2 admin events); matches plan §2
- [x] T1: `shared/src/schemas/ws/broadcast-events.ts` — `BroadcastEventSchemas` (5 events), `BroadcastEventName`, `BroadcastPayload<E>`, `BROADCAST_EVENT_NAMES`; `'+': 'reject'` removed from `WSAdminUserOnlineUpsertPayloadSchema`; `route-access.spec.ts` guards (no morph / Date / bigint / unknown, check builds in both modes) run over the registry
- [x] T2–T3: `broadcast-service.ts` — `createBroadcastService(options)`, generic methods; one `createResponseCheck` per event built at start, run once per event before serialization (`transport: 'broadcast'`); invalid event not sent, `error` logged. `broadcastToChannel` (server.ts) takes the serialized message. `broadcast-service.spec.ts`: `@ts-expect-error` on unknown event / foreign payload, valid send, mismatch dropped (both modes), extra key (strict dropped, log stripped + warn with path), one check per event for 3 connections, channel and target connection
- [x] T4: `support-service.ts` `broadcastToConnection` generic; `ws-presence-service.ts` compiles as is
- [x] T5: frontend guards for all 5 events in `ws-payload-guards.ts` (undeclared keys rejected), `useBroadcastHandler.ts` uses them; parity test over the registry (`onDeepUndeclaredKey('reject')`), 56 cases; `pnpm --filter frontend build` — no ArkType in `dist/assets`
- [x] T6: `bench:response` broadcast rows (log mode): `support_chat_token` check 0.52 µs vs JSON 0.55 µs; `admin_user_online_upsert` 0.72 µs vs 1.02 µs
- [x] T7: `websocket.md` (§«Контракт подій», example registers the event), `response-validation.md` (§Broadcast, cost), `shared/index.md`
- [x] 8.3 manual: local backend on :3100, temporary admin + user (DB rows and Redis keys removed after), real WebSockets. Admin subscribes to `api/admin/subscribe_online_users`, user connects → admin gets `broadcast:admin_user_online_upsert` `{id:"106",…,connectionsCount:1}`. Temporary `manualExtra` key in `ws-presence-service.ts` (reverted): `strict` — event not sent, `error` «Broadcast event dropped»; `log` — event sent without the key, `warn` with `route: "admin_user_online_upsert"`, `transport: "broadcast"`, `path: "manualExtra"`

## Evidence of Completion

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — exit 0
- `pnpm test` — backend 1173, frontend 168, api-playground 14, shared 14, documentation 26
- `CI=1 pnpm --filter frontend test:e2e` — 12 passed
- `pnpm docs:build && pnpm docs:verify` — passed

Commits:

- 3cd9bc8 Document the broadcast event contract and measure its check
- 3864c11 Guard every broadcast payload on the frontend with a parity test
- cdeea19 Check broadcast WS events against a shared schema registry
- c3f947a Plan feat-049: validate broadcast WS messages

## Notes for Next Session

1. Owner merges PR #165, then the feature PR
2. Done-PR to `main`: feat-049 → `done`
