# feat-047: task list

> До плану [`wire-format-response-schemas-plan.md`](./wire-format-response-schemas-plan.md). Гілка
> `feat/wire-format-response-schemas`. Кожен пункт — окремий коміт, якщо не сказано інше.

## Етап 0. Підготовка

- [ ] **0.1** PR у `main`: план + цей task list; feat-047 → `in_progress`, опис оновити (§4.4: швидкий
      шлях feat-046 не переглядається, морфів немає).
- [ ] **0.2** Гілка `feat/wire-format-response-schemas`, `progress.md`, `session-handoff.md`.
- [ ] **0.3** `./init.sh` — typecheck/lint/test зелені.
- [ ] **0.4** Базовий `LOG_LEVEL=silent pnpm --filter backend bench:response` → `progress.md`.

## Етап 1. Тести — RED (T1)

- [ ] **1.1** Охорона в `route-access.spec.ts`: жодна схема маршруту не містить `Date` / `bigint`
      (обхід `schema.json`); червона рівно на 6 маршрутах §2.
- [ ] **1.2** Тести `pushNotificationLogTransformer`: id / userId / subscriptionId → рядок, `null`
      лишається; `sentAt` → ISO UTC; `messageData` / `responseData` без змін.
- [ ] **1.3** Тести `promptTransformer`: id → рядок, `createdAt` / `updatedAt` → ISO UTC.
- [ ] **1.4** Тест статистики: `lastUsed` (зокрема `null`), `createdAt` → ISO.
- [ ] **1.5** (якщо §6 «так») `Infinity` / `-Infinity` у відповіді → 500 в обох режимах.

## Етап 2. Transformer'и (T2)

- [ ] **2.1** `app/transformers/push-notification-log-transformer.ts` (рядок і summary); експорт з
      `index.ts`.
- [ ] **2.2** `push-subscription-repository` / сервіс: `findByUserIdWithLogs`, `getSubscription`,
      `getSubscriptionLogs` повертають серіалізовані логи.
- [ ] **2.3** `app/transformers/prompt-transformer.ts`; `PromptController.list` / `getByType`.
- [ ] **2.4** `push-subscription-statistics-service.ts`: дати → ISO.
- [ ] **2.5** Тести 1.2–1.4 зелені.

## Етап 3. Схеми (T3)

- [ ] **3.1** `shared/responses/push-subscription-controller.ts`: `PushLogRowSchema`,
      `PushLogSummaryRowSchema`, статистика — `'string'` / `'string | null'`.
- [ ] **3.2** `shared/responses/prompt-controller.ts`: `PromptRowSchema`.
- [ ] **3.3** Охорона 1.1 зелена; `pnpm typecheck` чистий (feat-050 звіряє контролери).
- [ ] **3.4** `pnpm --filter backend test` зелений.

## Етап 4. Прибирання (T4)

- [ ] **4.1** `grep` по всіх пакетах: `PushSubscriptionSchema`, `PushSubscriptionLogSchema`,
      `PushSubscriptionLogSummarySchema` та їхні типи не використовуються.
- [ ] **4.2** Видалити їх з `shared/responses`.

## Етап 5. Наявні transformer'и (T5)

- [ ] **5.1** Рішення §6 про `toISOString()`; якщо «так» — `userTransformer`,
      `pushSubscriptionTransformer` на `toISOString()` з тестом формату (не залежить від TZ процесу).

## Етап 6. Фронтенд (T6)

- [ ] **6.1** `frontend/src/utils/api.ts`: `PushSubscriptionStatistics` → тип з `shared/responses`.
- [ ] **6.2** `pnpm --filter frontend typecheck`, `pnpm --filter frontend test`.

## Етап 7. Нескінченні числа (T7)

- [ ] **7.1** Рішення §6; якщо «так» — `Number.isFinite` в `inspectPayload` (код `non_finite_number`).
- [ ] **7.2** `bench:response` до / після; межа feat-046 — +50 % до перевірки feat-044.

## Етап 8. Документація (T8)

- [ ] **8.1** `documentation/backend/response-validation.md`, «Що саме перевіряється»: схема описує
      JSON, `Date` / `bigint` у схемах заборонені, правило «без морфів» постійне.
- [ ] **8.2** `documentation/backend/routing.md` (межі «Тип відповіді хендлера»: рядок про `Date`),
      `documentation/backend/validation.md` — за потреби.
- [ ] **8.3** `pnpm docs:build && pnpm docs:verify`.

## Етап 9. Definition of Done (T9)

- [ ] **9.1** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`.
- [ ] **9.2** `CI=1 pnpm --filter frontend test:e2e`.
- [ ] **9.3** Ручна перевірка: локальний бекенд у `strict`, `GET /prompts`,
      `GET /push-subscriptions/:id/logs`, `…/statistics` → 200; `/doc/routes` показує `string` для
      дат і id.
- [ ] **9.4** Evidence у `progress.md`; PR гілки; feat-047 → `done` через PR у `main`.
