# Session Progress Log

## Current State

**Last Updated:** 2026-10-21
**Active Feature:** feat-013 - Shared Rate-Limit Counter (in_progress)
**Branch:** `feat/redis-rate-limit`

Plan: [docs/plan/redis-rate-limit-plan.md](docs/plan/redis-rate-limit-plan.md) (rev. 10). Tasks: [docs/plan/redis-rate-limit-tasks.md](docs/plan/redis-rate-limit-tasks.md). Start PR: #31.

Goal: HTTP and WS-message limits stay in-memory (process protection); WS upgrade gets a Redis level 2; sensitive auth actions use Redis through the `config/throttle-policies.ts` registry; close login / change-password / forgot-password gaps; document both levels.

## Status

### Done

- [x] T0.1 PR #30 merged
- [x] T0.2 PR #31 opened (feat-013 → in_progress, plan, tasks)
- [x] T0.3 branch, progress.md, `./init.sh` green

### Next

- [ ] Stage 1 — separate Redis client for limits

## Notes for Next Session

- Branch was cut from `chore/feat-013-start` (PR #31) so the plan is present; rebase on `main` after #31 merges.
