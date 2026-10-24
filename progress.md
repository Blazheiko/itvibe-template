# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-022 - Push Data Access (F05 of `docs/plan/open-issues-roadmap.md`, items 20, 21, 49)
**Branch:** `feat/push-data-access`
**Plan:** `docs/plan/push-data-access-plan.md`; tasks: `docs/plan/open-issues-tasks.md`, F05

## Status

### Done

- [x] F05.S: PR #60 (feat-021 done, feat-022 `in_progress`, plan); `./init.sh` green
- [x] F05.1: `src/app/repositories/notifications/push-data.pg.test.ts` — fixture (user A: subscriptions with 7 / 2 / 0 logs, statuses incl. `NULL`, logs older than 7 days; user B; user without subscriptions) and verbatim copies of the legacy `findByUserIdWithLogs` and statistics as the reference. RED on the old code: 4 queries instead of 2; no `count(` in the statistics SQL
- [x] F05.2: `findByUserIdWithLogs` = subscriptions + `latestBySubscriptionIds` (`row_number() over (partition by subscription_id order by sent_at desc, id desc) <= 5`), grouped in a `Map`; no second query without subscriptions
- [x] F05.3: `push-notification-log-repository.ts` (`insertMany`, `countsBySubscription`, `latestBySubscriptionIds`) in the barrel; `touchLastUsed(ids, userId)` in `push-subscription-repository`
- [x] F05.4: statistics via `countsBySubscription` (`count(case …)`), 7-day boundary from the app clock; no `#database` imports in push services
- [x] F05.5: `sendToUser` — `PUSH_SEND_CONCURRENCY = 5`, one `insertMany`, one `touchLastUsed`; a failed write is logged and no longer turns a delivered push into `failed`
- [x] F05.6: new code-issues item 72 (no business event sends push); item 49 marked fixed with a link
- [x] F05.D: `documentation/backend/mail-push.md`, `documentation/backend/repositories-transformers.md` (warning about services using `db` removed, new repository in the table)

## Evidence of Completion

- `PG_TEST_URL=… pnpm --filter backend test:pg` (disposable `pgvector/pgvector:pg16`) — 15 passed: `findByUserIdWithLogs` deep-equal to the legacy copy, order / ≤ 5 newest / `[]`, 2 queries (1 for a user without subscriptions); statistics deep-equal to the legacy copy for 3 subscriptions, s1 counts 7 / 3 / 2 / 1 / last 7 days 5, `undefined` for another user's subscription, SQL has `count(` and does not read `message_body`; `insertMany` one statement (none for `[]`), `latestBySubscriptionIds([])` no query, `touchLastUsed` only the caller's subscriptions
- `push-notification-sender-service.spec.ts` — 5 passed: 12 subscriptions → max 5 in flight; one `insertMany` with SENT/FAILED rows, deactivate on 410, one `touchLastUsed` with the successful ids; result kept when the write fails; `notificationType` filter; no write without subscriptions
- Found while writing the RED test: the old sender imported the real `db`, so its unit test reached the PostgreSQL from `packages/backend/.env` (insert rejected by FK, nothing written). The new sender has no `#database` import
- Manual (backend from source on 3999, disposable DB, demo user, 3 subscriptions with 7 / 2 / 0 logs inserted by SQL): `GET /api/push-subscriptions` → 5 / 2 / 0 logs, newest first; `GET …/:id/statistics` → total 7, sent 2, failed 3, pending 2, last 7 days 7, successRate 28.57; the drizzle query log shows one `push_notifications_log` query per request. Redis keys `manual-feat022:*` removed afterwards
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 691, frontend 45, shared pass 3, documentation pass 26; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- new: `packages/backend/src/app/repositories/notifications/push-notification-log-repository.ts`, `…/push-data.pg.test.ts`, `packages/backend/src/app/services/notifications/push-notification-sender-service.spec.ts`, `docs/plan/push-data-access-plan.md` (PR #60)
- updated: `packages/backend/src/app/repositories/{index.ts,notifications/push-subscription-repository.ts}`, `packages/backend/src/app/services/notifications/push-notification-sender-service.ts`, `packages/backend/src/app/services/statistics/push-subscription-statistics-service.ts`, `documentation/backend/{mail-push,repositories-transformers}.md`, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`, `progress.md`

## Notes for Next Session

- Next: F08 Layering Cleanup (feat-025, needs feat-036 ✅) or F02 Docker (feat-019).
