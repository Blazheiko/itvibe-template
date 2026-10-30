# feat-051: task list

> До плану [`drop-legacy-response-validation-plan.md`](./drop-legacy-response-validation-plan.md).
> Гілка `chore/drop-legacy-response-validation`. Кожен пункт — окремий коміт, якщо не сказано інше.

## Етап 0. Підготовка

- [x] **0.1** PR у `main`: план + цей task list; feat-051 → `in_progress`.
- [x] **0.2** Гілка `chore/drop-legacy-response-validation`, `progress.md`, `session-handoff.md`.
- [x] **0.3** `./init.sh` — typecheck/lint/test зелені.
- [x] **0.4** Повторити `grep` з §2 плану; нові згадки — додати в план.

## Етап 1. Тести (T1)

- [x] **1.1** Прибрати `describe('legacy RESPONSE_VALIDATION …')` і старі змінні з `clean`.
- [x] **1.2** Конфіг без поля `warnings` (`toEqual({ mode, configError })`).
- [x] **1.3** Задана `RESPONSE_VALIDATION` не впливає на режим.

## Етап 2. Конфіг (T2)

- [x] **2.1** `config/response-validation.ts` за §4.1: лише нова змінна, без `warnings`.
- [x] **2.2** `app/start/validate-runtime-config.ts`: прибрати цикл попереджень.
- [x] **2.3** Тести етапу 1 зелені; `pnpm --filter backend test`.

## Етап 3. Коментарі (T3)

- [x] **3.1** `vendor/types/types.d.ts`, `vendor/start/router.ts`, `app/routes/route-access.spec.ts`:
      без згадок режиму `off`.

## Етап 4. Документація (T4)

- [x] **4.1** `packages/backend/.env.example`: прибрати рядок про стару назву.
- [x] **4.2** `documentation/backend/response-validation.md`: прибрати блок «Стара назва».
- [x] **4.3** `documentation/backend/configuration.md`: прибрати «ще один реліз».
- [x] **4.4** `pnpm docs:build && pnpm docs:verify`.

## Етап 5. Definition of Done (T5)

- [x] **5.1** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`.
- [x] **5.2** `CI=1 pnpm --filter frontend test:e2e`.
- [x] **5.3** Ручна перевірка: бекенд стартує з `RESPONSE_VALIDATION_CONTRACT=log`.
- [x] **5.4** `grep`: старі змінні лишились лише в `docs/plan/` і в тесті 1.3.
- [ ] **5.5** Evidence у `progress.md`; PR гілки; feat-051 → `done` через PR у `main`.
