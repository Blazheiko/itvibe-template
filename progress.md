# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-010 - Format Baseline (F00 of `docs/plan/open-issues-roadmap.md`, item 16 + Prettier part of item 68)
**Branch:** `feat/format-baseline`
**Tasks:** `docs/plan/open-issues-tasks.md`, wave 1

## Status

### Done

- [x] F00.S: PR #52 (feat-010 → `in_progress`); no open PRs at start (freeze); `./init.sh` green on `0fb0ad1`
- [x] F00.1: inventory (below)
- [x] F00.2: root `.prettierrc.json` (4 spaces, `'`, no `;`, 100); package configs of `documentation`, `frontend`, `api-playground` removed (no package had a reason to differ; playground's `tabWidth` 2 was undocumented). `prettier --find-config-path` → `.prettierrc.json` for a file of every package
- [x] F00.3: `.prettierignore` (build output, reports, drizzle migrations, lockfile, `graphify-out`)
- [x] F00.4: no conflict — root ESLint has no formatting rules (`stylisticTypeChecked` is type-aware code style), frontend/playground already extend `@vue/eslint-config-prettier`; `pnpm lint` green after formatting
- [x] F00.5: commit `60c735c` — only `pnpm format`, 422 files
- [x] F00.6: `.git-blame-ignore-revs` with `60c735c…`; README section; `git blame` on `packages/shared/src/index.ts` skips the commit
- [x] Docs: `documentation/reference/toolchain.md` Prettier section; code-issues item 16 fixed, item 68 Prettier part, new item 71 (`.vue`/`.js`/`.mjs`/`.css` outside the glob)

### Inventory (F00.1, `main` at `0fb0ad1`)

`pnpm format:check` (glob `**/*.{ts,tsx,json,md}`): 206 files.

| Area                      | Files |
| ------------------------- | ----- |
| `packages/backend`        | 132   |
| `packages/frontend`       | 31    |
| `packages/shared`         | 26    |
| `packages/api-playground` | 7     |
| `docs`                    | 6     |
| `documentation`           | 2     |
| `eslint.config.ts`        | 1     |
| `feature_list.json`       | 1     |

Prettier configs before the change:

| Config                                     | Settings                                          |
| ------------------------------------------ | ------------------------------------------------- |
| root                                       | none → Prettier defaults (2 spaces, `"`, `;`, 80) |
| `documentation/.prettierrc.json`           | 4 spaces, `'`, no `;`, 100                        |
| `packages/frontend/.prettierrc.json`       | 4 spaces, `'`, no `;`, 100                        |
| `packages/api-playground/.prettierrc.json` | `'`, no `;`, 100, **tabWidth default 2**          |

`.prettierignore` before: only `documentation/.vitepress/{cache,dist}/`.

ESLint: root uses `tseslint.configs.stylisticTypeChecked` (type-aware code-style rules such as `prefer-nullish-coalescing`, no formatting rules); frontend and api-playground already use `@vue/eslint-config-prettier`.

Scope note: the root glob does not cover `.vue`, `.js`, `.mjs`, `.css`; extending it is out of scope for feat-010 (recorded as a new code-issues item).

## Evidence of Completion

On `feat/format-baseline` after `60c735c` (macOS, Node 24.20.0):

- `pnpm format:check` — `All matched files use Prettier code style!` (before: 206 files on defaults, 423 with the new config)
- `pnpm typecheck` — exit 0
- `pnpm lint` — exit 0
- `pnpm test` — backend 88 files / 671 tests, frontend 8 / 45, shared pass 3, documentation pass 26
- `pnpm build` — exit 0
- `pnpm --filter frontend test:e2e` — 12 passed (chromium, firefox, webkit, Mobile Safari)
- `pnpm docs:build && pnpm docs:verify` — `verify-dist: all checks passed`
- No logic change: script comparing the TypeScript AST (node kinds + identifier/literal values, parentheses ignored) of every changed `.ts`/`.tsx` file before/after — `checked 385, differ 0` once `EmptyStatement` is ignored. The only 5 files that differ before that filter get Prettier's ASI guard (`;({ a } = b)`), required with `semi: false`. Negative control: a mutation (`return` → `return !`) in `packages/shared/src/utils/phone.ts` is reported (`differ 6`), then reverted
- Golden path: `git blame` with `blame.ignoreRevsFile` attributes lines to the original commits, not `60c735c`

## Files Modified

- new: `.prettierrc.json`, `.git-blame-ignore-revs`
- removed: `documentation/.prettierrc.json`, `packages/frontend/.prettierrc.json`, `packages/api-playground/.prettierrc.json`
- updated: `.prettierignore`, `README.md`, `documentation/reference/toolchain.md`, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`, `progress.md`
- formatted only (commit `60c735c`): 422 files

## Notes for Next Session

- After merge: notify branch owners to rebase; formatting commit hash is in `.git-blame-ignore-revs`.
