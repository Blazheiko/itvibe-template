# feat-048: task list

> До плану [`ws-error-envelope-plan.md`](./ws-error-envelope-plan.md). Гілка `feat/ws-error-envelope`.
> Кожен пункт — окремий коміт, якщо не сказано інше.

## Етап 0. Підготовка

- [x] **0.1** PR у `main`: план + цей task list; feat-048 → `in_progress`, опис оновити.
- [x] **0.2** Гілка `feat/ws-error-envelope`, `progress.md`, `session-handoff.md`.
- [x] **0.3** `./init.sh` — typecheck/lint/test зелені.

## Етап 1. Тести — RED (T1)

- [x] **1.1** `not_found` → `status: 'error'`, `data: null`.
- [x] **1.2** `validation_failed` (невалідний payload) → `data: null`, `details.kind: 'validation'`.
- [x] **1.3** Виняток handler'а після запису в `responseData.data` → `internal_error`, `data: null`.
- [x] **1.4** `event` з порожнім іменем маршруту (`':only'`) → `not_found`, `data: null`.
- [x] **1.5** Перевірка відповіді і rate limit → `data: null` (вже зелені, фіксують поведінку).

## Етап 2. Один модуль конверта (T2)

- [x] **2.1** `vendor/utils/network/ws-error-envelope.ts`: `createWsErrorEnvelope`, `setWsError`;
      unit-тести.
- [x] **2.2** `ws-api-dispatcher.ts`, `ws-handlers.ts`, `ws-rate-limit.ts` — імпорт замість копій.

## Етап 3. Диспетчер (T3)

- [x] **3.1** Усі шляхи помилок через `setWsError`.
- [x] **3.2** Початкове `data: null`.
- [x] **3.3** Фікстури з `data: {}` (`ws-admin-guard.spec.ts` та інші, що будують `responseData`).
- [x] **3.4** Тести етапу 1 зелені; `pnpm --filter backend test`.

## Етап 4. Документація (T4)

- [x] **4.1** `documentation/backend/websocket.md`: `data: null`; дві конвенції помилок (транспорт і
      бізнес).
- [x] **4.2** `pnpm docs:build && pnpm docs:verify`.

## Етап 5. Definition of Done (T5)

- [x] **5.1** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`.
- [x] **5.2** `CI=1 pnpm --filter frontend test:e2e`.
- [x] **5.3** Ручна перевірка: локальний бекенд, WS на неіснуючий маршрут і з невалідним payload →
      `data: null`.
- [ ] **5.4** Evidence у `progress.md`; PR гілки; feat-048 → `done` через PR у `main`.
