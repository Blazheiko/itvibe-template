# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-031 - Static Caching (F14 of `docs/plan/open-issues-roadmap.md`, items 39, 40, 41)
**Branch:** `feat/static-caching`
**Plan:** `docs/plan/static-caching-plan.md`; tasks: `docs/plan/open-issues-tasks.md`, F14

## Status

### Done

- [x] F14.S: PR #82 (feat-030 done, feat-031 `in_progress`, plan)
- [x] F14.1 (item 39): `immutable` only for `/assets/*`; everything else `no-cache` + ETag; HTML unchanged
- [x] F14.2 (item 40): `vendor/utils/network/if-none-match.ts` — `*`, lists, weak comparison
- [x] F14.3 (item 41): `StaticEntry` (memory / disk); `STATIC_MAX_MEMORY_FILE_SIZE` (1 MiB) and `STATIC_MAX_MEMORY_TOTAL` (64 MiB); larger files streamed with uWS backpressure, weak ETag from size + mtime; `index.html` always in memory (SPA fallback). Found while testing: re-caching a key counted its memory twice — fixed
- [x] F14.4 (item 41): `br` / `gzip` variants for text types ≥ 1 KiB built at startup when smaller, chosen by `Accept-Encoding` (q=0 respected), `Vary: Accept-Encoding`. **Changed from the roadmap:** compression at server start instead of `.br`/`.gz` from the frontend build — no new dependencies, works for any `public`
- [x] F14.D: `documentation/backend/{caching-etag,configuration}.md`, `packages/backend/.env.example`; code-issues 39, 40, 41 fixed

## Evidence of Completion

- `if-none-match.spec.ts` (10), `static-server-caching.spec.ts` (16): Cache-Control for `/assets/…` vs `/manifest.json` / `/service-worker.js`; 304 for exact / list / `W/` / `*`; a 300 KiB file over the 64 KiB limit is a disk entry and streams byte-identical through a double that accepts 16 KiB per `tryEnd` (backpressure); the 4th of four 60 KiB files passes the 200 KiB budget → disk; br/gzip decode to the original, identity with `Vary`, `q=0`, no compression for tiny files. Existing static specs moved to `memoryEntry(data)`
- Manual on real uWS (backend from source, `SERVE_STATIC=true`, frontend build + a random 5 MiB `.mp3` in `packages/backend/public`, disposable PostgreSQL/Redis): `Static files cached` → 83 files, 4 600 327 bytes in memory, 1 streamed from disk; `/assets/index-*.js` (873 428 B) → `immutable`, `br` 251 055 B / `gzip` 271 840 B / identity, all decode to the file; `/manifest.json` and `/service-worker.js` → `no-cache`; `If-None-Match: "x", W/<etag>` → 304; 5 MiB file → 200, `Content-Length: 5242880`, weak ETag, SHA-256 identical
- Note: `packages/backend/public` existed before the manual check (a `prod-local` copy of the frontend build, git-ignored); I removed it by mistake afterwards and recreated it the way `scripts/prod-local.sh` does (copy of the current `packages/frontend/dist`)
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 841, frontend 58, shared pass 3, documentation pass 26; `test:redis` 31; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- new: `packages/backend/src/vendor/utils/network/if-none-match.ts` (+ spec), `packages/backend/src/vendor/start/static-server-caching.spec.ts`, `docs/plan/static-caching-plan.md` (PR #82)
- updated: `packages/backend/src/vendor/start/static-server.ts` (+ `static-server.spec.ts`, `static-server-csp.spec.ts`), `packages/backend/src/config/app.ts`, `packages/backend/.env.example`, `documentation/backend/{caching-etag,configuration}.md`, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- Next: F15 Shared Cleanup (feat-032).
