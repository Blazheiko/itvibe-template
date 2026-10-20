# Session Handoff

## Current Objective

- Goal: feat-005 Security Hardening (items 1, 2, 3, 9)
- Current status: item 1 (CSP) done and verified; items 2, 3, 9 not started
- Branch / commit: `feat/security-hardening`

## Completed This Session

- [x] CSP for HTML / SVG / API / errors / OPTIONS, service worker exempt
- [x] `pnpm prod:local` and Playwright `test:e2e:csp` (enforce + report-only)
- [x] Docs for CSP, `CSP_*` env, nginx example, e2e

## Verification Evidence

See `progress.md` → Evidence of Completion (item 1).

## Blockers / Risks

- `test:e2e:csp` needs local PostgreSQL + Redis (from `packages/backend/.env`).
- Existing `e2e/mobile-layout.spec.ts` is broken independently (stale selector).

## Next Step

- Item 2: rate limit for WebSocket upgrade (`handleUpgrade` in `vendor/utils/network/ws-handlers.ts`) and a global per-IP limit.
