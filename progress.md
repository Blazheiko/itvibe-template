# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-029 - AI Quality (F12 of `docs/plan/open-issues-roadmap.md`, items 43, 52, 54)
**Branch:** `feat/ai-quality`
**Plan:** `docs/plan/ai-quality-plan.md`; tasks: `docs/plan/open-issues-tasks.md`, F12

## Status

### Done

- [x] F12.S: PR #78 (feat-028 done, feat-029 `in_progress`, plan)
- [x] F12.1 (item 52): optional `language` (≤ 16 chars) in `SupportOpenChatInputSchema` / `SupportChatInputSchema`; the frontend sends the i18n locale; `resolveSupportLanguage` maps it to `APP_LOCALE_CODES` (`pt-BR` → `pt`), else `SUPPORT_DEFAULT_LANGUAGE` (`en`, validated on start). **Changed from the roadmap:** there is no profile language, so the source is the UI locale; the schema accepts any short string so an unusual locale cannot break the chat with 422
- [x] F12.2 (item 54): `EMBEDDING_COLUMN_DIMENSIONS = 1536` in `src/database/embedding-dimensions.ts` (used by the schema and the config); another `OPENAI_EMBEDDING_DIMENSIONS` stops the start
- [x] F12.3 (item 54): `reindexAll` in batches of `SUPPORT_EMBEDDING_BATCH_SIZE` (50, 1–2048)
- [x] F12.4 (item 54): `searchByEmbedding(vector, limit, maxDistance)` with `SUPPORT_SEARCH_MAX_DISTANCE` (0.8) — **not calibrated** on real embeddings (no OpenAI key here); `ai.md` explains how to pick a value
- [x] F12.5 (item 43): `PROMPT_CACHE_TTL_MS` (60 s); stale reads answer from the cache and refresh in the background (one at a time, a failure keeps old values); `load()` replaces the whole map; `update()` visible at once
- [x] F12.D: `documentation/backend/{ai,caching-etag,database,configuration}.md`, `packages/backend/.env.example`; code-issues 43, 52, 54 fixed

## Evidence of Completion

- RED first: `config/support.spec.ts`, new cases in `config/ai.spec.ts` (dimensions, TTL, Support config in `validateRuntimeConfig`), `prompt-service.spec.ts` (fresh / stale with background refresh / single refresh / failed refresh keeps values / update at once)
- `support-embedding-service.spec.ts`: 120 articles → `embedBatch` sizes `[50, 50, 20]`, 120 vectors stored; search uses the configured max distance. `support-service.spec.ts`: `uk`, `pt-BR` → `pt`, `DE` → `de`, unknown/absent → `en`; `openChat` passes `uk` to the LLM
- `test:pg` — 22 passed; `searchByEmbedding(unit(0), 5, 0.5)` keeps the distance-0 article and drops the distance-1 one
- Manual start: `OPENAI_EMBEDDING_DIMENSIONS=3072` → `Invalid AI configuration: OPENAI_EMBEDDING_DIMENSIONS must be 1536 …`; `SUPPORT_DEFAULT_LANGUAGE=xx` → `Invalid Support AI configuration: …`
- `drizzle-kit check` fine, `drizzle-kit generate` — no schema changes
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 797, frontend 58, shared pass 3, documentation pass 26; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- new: `packages/backend/src/database/embedding-dimensions.ts`, `packages/backend/src/config/support.spec.ts`, `packages/backend/src/app/services/ai/prompt-service.spec.ts`, `packages/backend/src/app/services/support/support-embedding-service.spec.ts`, `docs/plan/ai-quality-plan.md` (PR #78)
- updated: `packages/backend/src/config/{ai,support}.ts` (+ `ai.spec.ts`), `src/database/schema.ts`, `src/app/start/validate-runtime-config.ts`, `src/app/services/ai/prompt-service.ts`, `src/app/services/support/{support-service,support-embedding-service}.ts` (+ spec), `src/app/repositories/support/support-knowledge-repository.ts` (+ pg test), `src/app/controllers/ws/support-controller.ts`, `packages/shared/src/schemas/support/{support-chat,support-open-chat}.ts`, `packages/frontend/src/views/SupportView.vue`, `packages/backend/.env.example`, docs listed above, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- Next: F13 Observability (feat-030).
