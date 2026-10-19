# Session Progress Log

## Current State

**Last Updated:** 2026-10-19
**Active Feature:** feat-011 - Documentation v2
**Branch:** `feat/docs-v2`

Plan: [docs/plan/vitepress-documentation-plan.md](docs/plan/vitepress-documentation-plan.md) (rev. 3)
Task list: [docs/plan/vitepress-documentation-tasks.md](docs/plan/vitepress-documentation-tasks.md), stage 6
Known code issues: [docs/plan/code-issues-found-during-docs.md](docs/plan/code-issues-found-during-docs.md)

Previous feature feat-003 (docs v1) is done; its log is in git history of this file (`main` @ `327d0de`).

## Status

### What's Done

- [x] T6.4 — `documentation/backend/websocket.md` (PR pending review)

### What's In Progress

- [ ] T6.1 — `documentation/backend/controllers-services.md`

### What's Next

Order (backend first): T6.4 websocket → T6.1 controllers-services → T6.2 repositories-transformers →
T6.3 validation → T6.8b deployment → T6.6 observability → T6.8a testing → T6.7 caching-etag →
T6.5a–c storage / mail-push / ai → T6.9a–c shared / frontend / playground → T6.10a–d.

Each page = one PR to `main`: code → page → sidebar → `KEY_PAGES` → `docs:build && docs:verify` → CI.

## Blockers / Risks

- [ ] PR #8 (register feat-011) must be merged before the first page PR.

## Decisions Made

- **New ID feat-011** instead of reusing the freed feat-004, to keep IDs unique.
- **Page PRs from this branch**: each page gets its own short-lived PR branch cut from `feat/docs-v2`
  or from `main`, so reviews stay one page per PR.

## Files Modified This Session

- `progress.md` — initialised for feat-011.

## Evidence of Completion

**T6.4 WebSocket** (`feat/docs-v2`):

- Page written from code (sub-agent), reviewed in main session; key claims re-checked in code:
  dispatcher returns `not_found` «Route not found» (`ws-api-dispatcher.ts:111`); bad token format →
  `401`, valid format without session → upgrade then close `4001` (`ws-handlers.ts`); frontend
  hardcodes `api/` prefix (`useWebSocketConnection.ts:320`).
- Fixed `backend/request-lifecycle.md` («Event not found» → «Route not found» + link).
- New issues 17–19 added to `docs/plan/code-issues-found-during-docs.md`; item 18 → security-hardening.
- Sidebar + `KEY_PAGES` updated; `pnpm docs:build` + `pnpm docs:verify` — all checks passed.
- Preview: 1 Mermaid SVG, 0 errors; 2 danger + 3 warning blocks; sidebar item active.

## Notes for Next Session

- Pages are written from code; known bugs are referenced from the code-issues file, not fixed here.
