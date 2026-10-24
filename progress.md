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

## Notes for Next Session

- After merge: notify branch owners to rebase; formatting commit hash is in `.git-blame-ignore-revs`.
