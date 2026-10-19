# Session Progress Log

## Current State

**Last Updated:** 2026-10-19
**Active Feature:** feat-003 - VitePress Documentation
**Branch:** `feat/vitepress-docs`

Plan: [docs/plan/vitepress-documentation-plan.md](docs/plan/vitepress-documentation-plan.md) (rev. 3)
Task list: [docs/plan/vitepress-documentation-tasks.md](docs/plan/vitepress-documentation-tasks.md)

## Status

### What's Done

- [x] T0.1 / T0.2 — `feat-003` (in_progress) and `feat-004` OpenAPI Generation (not-started)
      registered in `feature_list.json` via PR #1 (merged, `0501bed`).
- [x] T0.3 — branch `feat/vitepress-docs` created from `main`; `./init.sh` green (see Evidence).

- [x] Stage 1 — VitePress scaffold (T1.1–T1.8), see Evidence.
- [x] Stage 2 — `docs:verify` (T2.1–T2.5), see Evidence.

- [x] T3.1–T3.3 — `.github/workflows/docs.yml` + include-sources vs `paths` check.

- [x] T3.4 — draft PR #2 run: build success, deploy skipped.

- [x] Stage 4 — content v1 (T4.0–T4.13): 12 pages, see Evidence.

### What's In Progress

- [ ] Stage 5 — release v1 (T5.1–T5.7).

### What's Next

1. T3.5 (owner, manual) — Settings → Pages → Source: GitHub Actions (needed before T5.3).
2. T5.1 full run, T5.2 mark PR #2 ready for review.

## Blockers / Risks

- [ ] T3.5 (manual): repo owner must set **Settings → Pages → Source: GitHub Actions** before the first deploy (T5.3).
- [ ] `pnpm format:check` fails on `main` with 193 pre-existing files (incl. `eslint.config.ts`,
      `feature_list.json`); this branch adds no new failures. Not fixed — out of scope.
- [ ] Backend tests hit timeouts (7/268) once when run under heavy parallel load; re-runs
      (backend alone and full `pnpm test`) are 268/268. Watch for flakiness in CI.

## Decisions Made

- **feat-003 has no dependencies**: `feat-001`/`feat-002` are template placeholders; the docs site does not depend on them.
- **OpenAPI split out to feat-004**: `packages/backend/src/openapi/spec.ts` is empty; generation needs app code changes.

- **Pinned versions**: `vitepress@1.6.4`, `vitepress-plugin-mermaid@2.0.17`, `mermaid@11.17.2`
  (plugin peer is `mermaid 10 || 11`, so 12.x is not used), `typescript@6.0.3` (workspace pin).
- **No explicit `vue`**: `pnpm install` shows no `vue` peer warning (VitePress ships `vue@^3.5.13`).
- **`docs:verify` script** is added in T2.1 together with the script file, not in T1.1.
- **`docs:verify` layout**: pure helpers in `documentation/scripts/verify/lib.mjs` with
  `node:test` unit tests (`lib.test.mjs`, run by `pnpm test` via the `documentation` package);
  the runner `scripts/verify-dist.mjs` holds `KEY_PAGES`, `HOME` and `INCLUDE_MARKERS`.
  HTML parsing via `node-html-parser@9.0.5`.
- **CI runs `documentation` test** (verify helpers) in addition to typecheck/build/verify.
- **Workflow `paths` parsed with `yaml@2.9.1`** (resolves `&docs_paths` anchors); globs matched
  with Node's `path.posix.matchesGlob`.
- **Mermaid chunk-size warning** (>500 kB) during build is expected and left as is.

- **No includes of existing docs**: most sources are in Russian or stale (T4.0 below); pages are
  written in Ukrainian from code and link the sources on GitHub. The smoke page (only include) was
  removed; the include and workflow-paths checks stay in `docs:verify` for future includes.
- **Content written by parallel sub-agents**, each restricted to its own files; integration
  (sidebar, verify list, links), review and checks done in the main session.

### T4.0 — status of existing documents

| Document                                                  | Status                                                                | Action                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/backend/README.md`                              | current                                                               | source for configuration/auth/routing pages                            |
| `packages/backend/src/docs/SESSION_SECURITY.md`           | partly stale (TTL 2h/Strict vs code 24h/Lax)                          | source only, rewritten in `backend/auth-security.md`                   |
| `packages/backend/src/vendor/start/SECURITY_ANALYSIS.md`  | stale: 12/15 fixed, C-2 and M-5 partial, L-4 open                     | not published; open items shown as `::: danger`                        |
| `packages/backend/src/docs/HTTP_BODY_LIMITS_PLAN.md`      | mostly implemented (defaults differ, no tests, not in `.env.example`) | implemented part on `request-lifecycle.md`, rest as `::: warning План` |
| `packages/backend/src/docs/VALIDATOR_ABSTRACTION_PLAN.md` | largely implemented (adapters, contracts)                             | not published (historical; ADR candidate)                              |
| `packages/backend/src/docs/etag-improvements.md`          | stale (SHA1 content hash already used)                                | not published                                                          |
| `packages/backend/src/vendor/directory-structure.md`      | stale                                                                 | not published                                                          |
| `packages/backend/src/scripts/README.md`                  | stale (scripts no longer exist)                                       | not published                                                          |

### Code/docs issues found (documented, NOT fixed — out of scope)

Full list with evidence, severity and proposed follow-up features:
[docs/plan/code-issues-found-during-docs.md](docs/plan/code-issues-found-during-docs.md).

## Files Modified This Session

- `progress.md` — initialised for feat-003.
- `documentation/` — `package.json`, `tsconfig.json`, `.prettierrc.json`, `.vitepress/config.ts`,
  `.vitepress/theme/{index.ts,custom.css}`, `public/logo.svg`, `index.md`, `guide/smoke.md`.
- `pnpm-workspace.yaml` — `documentation` package; `package.json` — root `docs:dev|build|preview`.
- `.gitignore`, `.prettierignore`, `eslint.config.ts` — ignore `documentation/.vitepress/{cache,dist}`.
- `pnpm-lock.yaml` — VitePress dependencies.
- `documentation/scripts/verify-dist.mjs`, `documentation/scripts/verify/{lib,lib.test}.mjs` —
  `docs:verify`; `documentation/package.json` — `docs:verify`, `test`; root `docs:verify`.
- `.github/workflows/docs.yml` — docs CI/CD.
- `documentation/{guide,backend,reference}/*.md` — 12 v1 pages; `guide/smoke.md` removed;
  `.vitepress/config.ts` nav/sidebar; `index.md` hero + features; `KEY_PAGES` in `verify-dist.mjs`.

## Evidence of Completion

Baseline before changes (T0.3), `./init.sh` on `feat/vitepress-docs` @ `0501bed`, Node v24.20.0 — exit 0:

- `pnpm install` — ok
- `pnpm typecheck` — clean
- `pnpm lint` — clean
- `pnpm test` — shared 1/1, frontend 27/27 (5 files), backend 268/268 (51 files)
- `pnpm build` — ok

Stage 1 acceptance (T1.8), `feat/vitepress-docs`:

- `pnpm typecheck` — clean, includes `documentation typecheck` (`tsc --noEmit -p tsconfig.json`)
- `pnpm lint` — clean; type-aware rules confirmed on `documentation/.vitepress/*.ts`
  (probe file triggered `strict-boolean-expressions`, then removed)
- `pnpm test` — shared 1/1, frontend 27/27, backend 268/268
- `pnpm docs:build` — build complete
- `pnpm format:check` — 193 failures, identical count to `main`; no new files listed
- Manual (`vitepress preview`, `/itvibe-template/guide/smoke`): Mermaid rendered to SVG (1),
  include of `packages/backend/src/scripts/README.md` rendered (`h1` "Build Scripts"),
  `/itvibe-template/logo.svg` loaded, brand CSS applied, no console errors

Stage 2 acceptance (T2.1–T2.5):

- `pnpm --filter documentation test` — 24/24 (URL classes, cleanUrls resolution, Cyrillic anchors,
  srcset, include parsing, markers, Mermaid count, md→dist mapping)
- `pnpm docs:build && pnpm docs:verify` — all checks passed
- Mutation checks (each must fail, then restored to green):
  - include source renamed → `source file not found` (VitePress itself built silently)
  - include text removed from HTML → `text ... not found in .vp-doc`
  - article emptied to `h1` only → `0 chars without headings`, include + Mermaid errors
  - `.VPHero` removed → `no .VPHero`
  - injected links: missing asset, `/logo.svg` outside base, missing page, missing `#anchor` →
    4 errors; `https:`, `mailto:`, `data:`, `#local` ignored
  - Mermaid container removed → `expected 1 Mermaid container(s), found 0`
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (incl. backend 268/268) — green

Stage 3 (T3.1–T3.3):

- `actionlint` 1.7.12 (docker `rhysd/actionlint`) — no findings on `.github/workflows/docs.yml`
- upload-pages-artifact and deploy share `github.ref == 'refs/heads/main' && github.event_name != 'pull_request'`
- `pnpm --filter documentation test` — 26/26; `docs:verify` — all checks passed
- Mutation: removing `packages/backend/src/scripts/README.md` from `paths` → `not covered by
on.pull_request.paths` and `on.push.paths` (anchor resolved); restored → green
- `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint` — green
- T3.4: draft PR https://github.com/Blazheiko/itvibe-template/pull/2, run
  https://github.com/Blazheiko/itvibe-template/actions/runs/39293516666 (`pull_request`) —
  `build` success, `deploy` skipped. `workflow_dispatch` check moved to T5.3a (needs workflow on `main`).

Stage 4 (T4.0–T4.13):

- T4.2 clean run (scratch clone, docker `pgvector/pgvector:pg16` + `redis:7` on non-default ports):
  `pnpm install` ok → `db:create` ok → `db:migrate` ok → `db:seed` ok (no-op) → `pnpm dev` failed
  with `SERVE_STATIC=true` (documented), ok with `false` → `curl /api/ping` 200 `{"status":"ok"}`,
  frontend :5173 200. Containers removed afterwards.
- T4.3 env inventory: 109 names from code; table names == code names (`comm -3` empty), checked
  independently. Regenerate: `grep -rhoE "(process\.)?env(\[['\"][A-Z][A-Z0-9_]*['\"]\]|\.[A-Z][A-Z0-9_]*)" packages/backend/src packages/backend/drizzle.config.js --include='*.ts' --include='*.js' --exclude='*.spec.ts' | grep -oE "[A-Z][A-Z0-9_]+" | sort -u`
- T4.11 real run of the `notes` example in a throwaway worktree: `pnpm typecheck` clean, backend
  tests 271/271 (incl. 3 new), eslint on touched files clean, `db:generate` produced the migration
  shown on the page; worktree discarded. `db:migrate` on a live DB not run (stated on the page).
- `pnpm docs:build` + `pnpm docs:verify` — all checks passed, 12 key pages + home hero.
- Browser (`vitepress preview`): 7 Mermaid diagrams on 6 pages rendered to SVG, no syntax errors,
  no broken images; Ukrainian search: «міграції», «сесія», «конфігурація» return relevant pages.
- Secret scan of pages: no key-like strings; no files outside `documentation/` changed.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (documentation 26, shared 1, frontend 27, backend 268) — green.

Stage 5 — T5.1 full run before merge (`feat/vitepress-docs` @ `3d8c971`), exit 0:

- `pnpm typecheck` clean; `pnpm lint` clean
- `pnpm test`: documentation 26/26, shared 1/1, frontend 27/27, backend 268/268
- `pnpm docs:build` complete; `pnpm docs:verify` — all checks passed
- `pnpm format:check` — 193 pre-existing warnings, same as `main`
- T3.5 confirmed via API: Pages `build_type: workflow`, `https://blazheiko.github.io/itvibe-template/`

## Notes for Next Session

- Follow the task list in order; the critical path is at the end of the task list.
- `docs:verify` (stage 2) is built before content, so every new page is added to its check list in the same task.
