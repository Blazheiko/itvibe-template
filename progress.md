# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-009 - Internal Docs Cleanup (item 15 of `docs/plan/code-issues-found-during-docs.md`, scope extended)
**Branch:** `feat/internal-docs-cleanup`

All steps of `docs/plan/internal-docs-cleanup-plan.md` are done. Next: PR `feat/internal-docs-cleanup` → `main`, then a done PR.

## Status

### Done

- [x] PR #48: feat-009 → `in_progress`, description extended
- [x] Step 3: reference map for every removed / moved file (`git grep`); live links fixed in `documentation/backend/{caching-etag,validation,request-lifecycle,auth-security,architecture}.md`, `.github/workflows/docs.yml` paths
- [x] Step 4: security audit traced — `docs/security/security-analysis-status.md` (fix file:line, commit/PR, test per finding)
- [x] Step 5 backend: removed `SESSION_SECURITY.md`, `etag-improvements.md`, `SECURITY_ANALYSIS.md`, `directory-structure.md`, dead `src/scripts/export-types.js`; `VALIDATOR_ABSTRACTION_PLAN.md` → `docs/adr/0001-validator-abstraction.md`; `HTTP_BODY_LIMITS_PLAN.md` → `docs/plan/http-body-limits-original-plan.md` (status note extended); `src/docs/` is gone; `scripts/README.md` rewritten; backend `README.md`: request diagram (rate limit path, L1, query validation, 422, body rules, 204), body limits / `parseSize`, GET/DELETE without validator, `test:redis`, `db:create:prod`
- [x] Step 6: root `README.md` (`db:create && db:migrate`, `docs:*`, `prod:local`), `AGENTS.md` (Drizzle dirs, no `.git` sentence)
- [x] Step 7 api-playground: layout and troubleshooting merged into `documentation/playground/index.md`; removed 8 docs and 3 empty files; short `README.md`; `ROADMAP.md`, `UI-UX-ANALYSIS.md` marked as internal notes
- [x] Step 8 frontend: `README.md` without News; `composables/README.md` rewritten for the current `useWebSocketConnection` API; `SINGLETON_EXPLANATION.md` merged and removed
- [x] Step 9: status lines in 13 plans; summary table and items 15, 69 marked fixed in `code-issues-found-during-docs.md`

## Files Modified

- new: `docs/security/security-analysis-status.md`, `docs/adr/0001-validator-abstraction.md`, `docs/plan/internal-docs-cleanup-plan.md`
- moved: `packages/backend/src/docs/HTTP_BODY_LIMITS_PLAN.md` → `docs/plan/http-body-limits-original-plan.md`
- removed: `packages/backend/src/docs/{SESSION_SECURITY,etag-improvements,VALIDATOR_ABSTRACTION_PLAN}.md`, `src/vendor/start/SECURITY_ANALYSIS.md`, `src/vendor/directory-structure.md`, `src/scripts/export-types.js`; `packages/api-playground/{QUICK-WINS.md,test-navigation.html,test-ws-server.js,ws-test-server.js}`, `packages/api-playground/docs/{API-DOCUMENTATION,API-TESTING-IMPROVEMENTS,CORS-SOLUTION,NAVIGATION-STRUCTURE,TESTING-NAVIGATION,TROUBLESHOOTING,WEBSOCKET-USAGE}.md`; `packages/frontend/src/composables/SINGLETON_EXPLANATION.md`
- updated: `README.md`, `AGENTS.md`, `packages/backend/README.md`, `packages/backend/src/scripts/README.md`, `packages/api-playground/README.md`, `packages/api-playground/docs/{ROADMAP,UI-UX-ANALYSIS}.md`, `packages/frontend/README.md`, `packages/frontend/src/composables/README.md`, `documentation/backend/{architecture,auth-security,caching-etag,request-lifecycle,validation}.md`, `documentation/playground/index.md`, `.github/workflows/docs.yml`, 13 plans in `docs/plan/`

## Evidence of Completion

- `pnpm typecheck`, `pnpm lint` clean; `pnpm test`: backend 671, frontend 45, shared 3, documentation 26 (code unchanged except the dead `export-types.js`)
- `pnpm docs:build && pnpm docs:verify`: all checks passed
- Link check (one-off Node script, not committed; same exceptions as "Дозволені залишки"): GitHub `blob|tree/<ref>/<path>` links checked against the branch tree (`main`) or `git cat-file -e` (commit permalinks), relative links (`./…`, `../…`) resolved from the file's folder. Result: 852 links in 78 `.md` files, **0 violations**, 5 allowed with a reason (4 placeholders in `internal-docs-cleanup-plan.md`, 1 old path in the historical `ws-upgrade-rate-limit-plan.md`)
- `git grep` for every removed / moved name: remaining hits only in the allowed list — historical plans with a status line, `internal-docs-cleanup-plan.md`, `code-issues-found-during-docs.md`, the fixture in `documentation/scripts/verify/lib.test.mjs`, commit permalinks (`docs/adr/0001…`, `docs/security/…`, `caching-etag.md`), `feature_list.json` description. Added to the list: `progress.md` / `session-handoff.md` (working files that name what was removed)
- Security audit (step 4): 15 of 15 have a fix in the code; 13 are already in root snapshot `8f3479f` (no earlier history), M-5 CSP — `0647eb3` / PR #22, L-4 — `fd15150` / PR #29. **Closed with a test:** C-2, H-2, M-1, M-5, L-4. **Closed, no test:** C-1, H-1, H-3, H-4, M-2, M-3, M-4, L-1, L-2, L-3 (M-3 moved here in review: the cited 415 tests cover a missing `Content-Type`, not a type outside `allowedContentTypes`). C-2: route limit in `8f3479f`, global L1 added in `afd539a` (PR #22) Negative controls: M-1 (1 of 5 fails without `!Array.isArray`), L-4 (4 fail without the guard), M-4 (regex → `true` keeps 13/13 green, so the regex is untested)
- Manual: `pnpm --filter api-playground dev` → `http://localhost:5174` 200; `pnpm --filter backend mail:test` without arguments prints the usage line from `scripts/README.md`; every script named in the rewritten READMEs exists in `package.json`. Not run: `db:create && db:migrate` against a database (command form only)

## Notes for Next Session

- Open PR `feat/internal-docs-cleanup` → `main`, then a done PR for feat-009.
- Follow-ups found, out of scope:
  - tests for the 10 security findings without a test (list and priorities in `docs/security/security-analysis-status.md`) — candidate feature;
  - `packages/backend/src/scripts/copy-static.js` is not wired into any script or the Dockerfile and is broken (root resolves to `src/`, so it reads `src/public` and writes `src/dist`) — removed from `scripts/README.md`; delete or fix in a code cleanup (item 27);
  - api-playground "Test Connection" calls `<baseUrl>/health`, which the backend does not have (documented in `documentation/playground/index.md`);
  - frontend `websocketApi` checks `apiResolve[key]` (`timestamp_event`) but stores under `event`, so the duplicate-request guard never fires (`useWebSocketConnection.ts`).
