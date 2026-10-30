# Session Progress Log

## Current State

**Last Updated:** 2026-10-30
**Active Feature:** feat-050 - Typed Route Responses
**Branch:** `feat/typed-route-response` (based on `chore/feat-050-in-progress`, PR #149)
**Plan:** `docs/plan/typed-route-response-plan.md`, tasks: `docs/plan/typed-route-response-tasks.md`

## Status

### Done

- [x] 0.1: PR #149 (review notes §7, task list, feat-050 → `in_progress`). Checks green; **not merged** — merge needs the owner
- [x] 0.4 / 7.1: `pnpm --filter backend typecheck` — before 1.93 s (1.93 / 1.96 / 1.90), after 2.31 s (2.14 / 2.31 / 2.47, cold 3.02 s excluded). Noisy; growth ≈ 0.4 s
- [x] 0.5 / 7.2: `ResponseSchema` coverage 60/60 HTTP, 4/4 WS (plan said 5 WS; there are 4)
- [x] 1.1–1.2: all `shared/responses` schemas are `type(...)` / `type.or(...)` → static `Type`; generic constraint `Type` accepts all 64 routes
- [x] 1.3: `RouteResponse<TRes>` — input not assignable to `Payload` → marker `ResponseSchemaIsNotPayload<TIn>` (no result satisfies it); no current schema hits it
- [x] 1.4: no controller is shared between HTTP and WS (WS controllers live in `controllers/ws`)
- [x] 1.5 / 4.2 / 6: no `204` routes. Redirects: OAuth `redirect`, `callback` (own schemas, different statuses, already conform) and `/support/screenshot/:articleId`. Decision: specialised `SupportScreenshotResponseSchema`, no shared redirect schema
- [x] 2–3, 5: type tests in `define-route.spec.ts` (RED: 8 unused `@ts-expect-error`), `TypedHandler`, `route-response.ts`, generic in `defineRoute` / `defineWsRoute`; contracts kept (optional `ResponseSchema`, default `undefined`, returns `RouteItem`, runtime unchanged)
- [x] 3.5–3.6: alias `RouteResponse` is expanded in messages; a route-name marker (`TUrl` generic) does not show up either (unused alias param dropped) → reverted. The error is already reported on the route's `handler:` line
- [x] 4: `testPush` → `TestPushResponse`; screenshot schema + `getScreenshot` narrowed; `serialize-routes` fixtures. `serializeRoutes` consumer is only `/doc/routes`; frontend uses the screenshot URL as an image, not its body
- [x] 8: `routing.md` (new section «Тип відповіді хендлера» with the real error), `adding-a-feature.md`, `first-endpoint.md`

### Findings that changed the plan

- **Inline handlers widen literals too.** TypeScript widens a literal whose contextual type is the generic `TRes['inferIn']` (minimal repro, also with `NoInfer` and `const` variants), so `() => ({ status: 'ok' })` fails; `as const` or an annotation is needed. Plan §3.1 claimed otherwise; test fixes the limit

## Evidence of Completion

- `pnpm typecheck` — exit 0
- `pnpm lint` — exit 0; `pnpm format:check` — exit 0
- `pnpm test` — backend 1087/1087 (131 files), frontend 126/126, api-playground 14/14, shared passed
- `CI=1 pnpm --filter frontend test:e2e` — 12 passed
- `pnpm docs:build && pnpm docs:verify` — «verify-dist: all checks passed»
- Mutation: `/ping` with `ReadyResponseSchema` → `http-routes.ts(54,9): error TS2322`; WS `support_chat` with `AdminOnlineUsersWsResponseSchema` → `ws-routes.ts(39,17): error TS2322`; reverted. (Swapping to `SupportOpenChatResponseSchema` gives no error — it is identical to `SupportChatResponseSchema`.)
- Golden path: the feature is type-level; verified by the mutation check above and the type tests. Runtime path unchanged (`defineRoute` body only re-attaches `handler`)

Commits:

- 97681fd Format define-route helpers
- e7db907 Document typed route responses in routing and controller guides
- 241d87d Fix serialize-routes fixtures to return what their schemas declare
- ba139b7 Give GET /support/screenshot/:articleId its own redirect schema
- c24690a Narrow testPush result to TestPushResponse
- 52d3f1c Check handler results against ResponseSchema in defineRoute/defineWsRoute

## Notes for Next Session

1. Owner merges PR #149, then the feature PR (rebase on `main` if #149 is squashed)
2. After merge: PR to `main` flipping feat-050 → `done` with the evidence commit
