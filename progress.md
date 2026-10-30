# Session Progress Log

## Current State

**Last Updated:** 2026-10-30
**Active Feature:** feat-046 - Strip Undeclared Response Fields
**Branch:** `feat/strip-response-fields` (based on `docs/feat-046-plan`, PR #152)
**Plan:** `docs/plan/strip-response-fields-plan.md`, tasks: `docs/plan/strip-response-fields-tasks.md`

## Status

### Done

- [x] 0.1: PR #152 (plan, task list, feat-046 → `in_progress` with the new description). **Not merged** — merge needs the owner
- [x] 0.5 / T0.5 perf spike: `pnpm --filter backend bench:response` (`src/scripts/bench-response-check.ts`), thresholds §4.7 reachable:

    | items | json ms | feat-044 check | reject (clean) | reject/json | reject/check | undeclared path | /json |
    | ----- | ------- | -------------- | -------------- | ----------- | ------------ | --------------- | ----- |
    | 10    | 0.0183  | 0.0138         | 0.0178         | 0.97        | 1.29         | 0.189           | 10.3× |
    | 100   | 0.1744  | 0.1349         | 0.1652         | 0.95        | 1.22         | 1.680           | 9.6×  |
    | 1000  | 1.8930  | 1.3734         | 1.6541         | 0.87        | 1.20         | 17.16           | 9.1×  |

    All within §4.7 (≤ 1.2× json, ≤ +30 % check, ≤ 0.25 / 2.5 ms, ≤ 15×). Borderline: +29 % vs check at 10 items.

- [x] 0.6: mentions of `RESPONSE_VALIDATION*` — backend config/spec/validate-runtime-config, router, server/ws tests, `.env.example`, backend README, docs (`response-validation`, `configuration`, `routing`, `validation`), plans
- [x] 1.1 audit of `unknown` in route response schemas (guard `route-access.spec.ts`): 17 fields on 17 routes. Detailed: push-subscriptions (all 7 routes), prompts, support chat history, knowledge base. Exceptions without the guarantee: `details` (canonical error), push log `messageData` (notification `data` the user's device already got). Unused schemas (`Test*`, `Index`, `Success`, `GetSetCookies`) are not on any route
- [x] 1.2: `/test-*` debug schemas are not used by any route → no exception needed
- [x] 1.3 / 2.9: no morphs in response schemas; guard test over all routes
- [x] T1/T3/T4/T5 (`5457f1e`): config `RESPONSE_VALIDATION_CONTRACT` + legacy mapping; `createResponseCheck` reject → (mismatch 500 | strict 500 | log strip); HTTP and WS send the returned payload
- [x] T6 (`31f7e1e`, `0d4b71a`): wire-shape schemas; jsonb `notification_types` / `response_data` typed via `$type<>()` (no SQL change). Found: prompt, llm-usage and avatar schemas described errors by hand (no canonical fields) → would be 500 on every `mapControllerError`; now `CanonicalErrorResponseSchema`; guard added
- [x] T2 live crawl (`f7e6a9a`): temporary admin in the local DB (removed after), 32 requests (auth, main, oauth providers, push CRUD incl. logs/statistics/deactivate/delete, support history, knowledge base read, prompts, admin usage/users/online). Found and fixed:
    - backend did **not start in `log`**: `ResetPasswordResponseSchema` had an overlapping second error branch; ArkType rejects `delete` (a morph) on it. New guard builds the check in both modes for every route
    - `POST /auth/login` returned `user.avatar/created_at/updated_at` outside the schema (client keeps `avatar`) → declared
    - After fixes: 0 response-validation records in `log` and in `strict`. Unrelated 500s: `vapid-public-key` (no VAPID keys locally), `admin/history-online` (local DB lacks the `user_online.role` migration, known since feat-044)
    - Not crawled: WS routes (dispatcher tests only), knowledge base writes (they call the embedding API)
- [x] T8 docs: `response-validation.md` rewritten (modes, algorithm, exceptions, logs, cost), `configuration.md`, `routing.md`, `validation.md`, backend README, `.env.example`, scripts README

### Not done

- [ ] PR #152 merge, feature PR, merge
- [ ] T10 staging gate (owner): ≥ 7 days on staging in `log`, 0 mismatch records; only then production release and feat-046 → `done`
- [ ] At the done-PR: update feat-045 description (no `off`; `log` is fail-closed for mismatches) and add a feat-047 note (fast path sends the original object — revisit with morphs); register removal of the legacy `RESPONSE_VALIDATION` name

## Evidence of Completion

- `pnpm typecheck` — exit 0
- `pnpm lint` — exit 0; `pnpm format:check` — exit 0
- `pnpm test` — see commit trailer of the last commit
- `CI=1 pnpm --filter frontend test:e2e` — 12 passed
- `pnpm docs:build && pnpm docs:verify` — passed
- Crawl in `log` / `strict` — 0 response-validation records (above)

## Notes for Next Session

1. Owner merges PR #152, then the feature PR
2. Staging week (T10), then production and the done-PR with the feat-045/feat-047 updates
