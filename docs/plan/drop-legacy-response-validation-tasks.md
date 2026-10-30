# feat-051: task list

> До плану [`drop-legacy-response-validation-plan.md`](./drop-legacy-response-validation-plan.md).
> Гілка `chore/drop-legacy-response-validation`. Кожен пункт — окремий коміт, якщо не сказано інше.

## Етап 0. Підготовка

- [ ] **0.1** PR у `main`: план + цей task list; feat-051 → `in_progress`.
- [ ] **0.2** Гілка `chore/drop-legacy-response-validation`, `progress.md`, `session-handoff.md`.
- [ ] **0.3** `./init.sh` — typecheck/lint/test зелені.
- [ ] **0.4** Повторити `grep` з §2 плану; нові згадки — додати в план.

## Етап 1. Тести (T1)

- [ ] **1.1** Прибрати `describe('legacy RESPONSE_VALIDATION …')` і старі змінні з `clean`.
- [ ] **1.2** Конфіг без поля `warnings` (`toEqual({ mode, configError })`).
- [ ] **1.3** Задана `RESPONSE_VALIDATION` не впливає на режим.

## Етап 2. Конфіг (T2)

- [ ] **2.1** `config/response-validation.ts` за §4.1: лише нова змінна, без `warnings`.
- [ ] **2.2** `app/start/validate-runtime-config.ts`: прибрати цикл попереджень.
- [ ] **2.3** Тести етапу 1 зелені; `pnpm --filter backend test`.

## Етап 3. Коментарі (T3)

- [ ] **3.1** `vendor/types/types.d.ts`, `vendor/start/router.ts`, `app/routes/route-access.spec.ts`:
      без згадок режиму `off`.

## Етап 4. Документація (T4)

- [ ] **4.1** `packages/backend/.env.example`: прибрати рядок про стару назву.
- [ ] **4.2** `documentation/backend/response-validation.md`: прибрати блок «Стара назва».
- [ ] **4.3** `documentation/backend/configuration.md`: прибрати «ще один реліз».
- [ ] **4.4** `pnpm docs:build && pnpm docs:verify`.

## Етап 5. Definition of Done (T5)

- [ ] **5.1** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`.
- [ ] **5.2** `CI=1 pnpm --filter frontend test:e2e`.
- [ ] **5.3** Ручна перевірка: бекенд стартує з `RESPONSE_VALIDATION_CONTRACT=log`.
- [ ] **5.4** `grep`: старі змінні лишились лише в `docs/plan/` і в тесті 1.3.
- [ ] **5.5** Evidence у `progress.md`; PR гілки; feat-051 → `done` через PR у `main`.
