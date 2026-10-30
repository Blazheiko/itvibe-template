# feat-050: task list

> До плану [`typed-route-response-plan.md`](./typed-route-response-plan.md). Гілка
> `feat/typed-route-response`. Кожен пункт — окремий коміт, якщо не сказано інше.

## Етап 0. Підготовка

- [x] **0.1** PR у `main`: зауваження §7 + цей task list; feat-050 у `feature_list.json` → `in_progress`.
- [x] **0.2** Створити гілку `feat/typed-route-response`, `progress.md`, `session-handoff.md`.
- [x] **0.3** `./init.sh` — typecheck/lint/test зелені.
- [x] **0.4** Базовий замір: `pnpm --filter backend typecheck` × 3, медіана → `progress.md` (T6).
- [x] **0.5** Метрика покриття: скільки з 60 HTTP і 5 WS маршрутів мають `ResponseSchema` → `progress.md` (§7.8).

## Етап 1. Передумови (§7.1–7.2, до T2)

- [x] **1.1** Перевірити статичний тип схем у `shared/responses`: `Type` чи `BaseType`
      (особливо union'и з `CanonicalErrorResponseSchema`). Зафіксувати результат у `progress.md`.
- [x] **1.2** Якщо є `BaseType` — вирішити: звузити тип у `shared` або розширити обмеження
      генерика. Рішення записати в план.
- [x] **1.3** Вирішити сумісність із `Payload`: `InferResponse<TRes> & Payload` чи обмеження
      генерика. Перевірити на масиві верхнього рівня і полі `Date`.
- [x] **1.4** Знайти контролери, спільні для HTTP і WS (§7.7); список → `progress.md`.
- [x] **1.5** Перелічити маршрути-редиректи та `204` (OAuth `redirect`/`callback`,
      `/support/screenshot/:articleId`, інші) — конкретний обсяг T5 (§7.5).

## Етап 2. Тести типів — RED (T1)

У `define-route.spec.ts`; запуск `pnpm --filter backend typecheck` — очікувано падає на
невикористаних `@ts-expect-error`.

- [x] **2.1** Невідповідний результат → `@ts-expect-error`.
- [x] **2.2** Чужа схема для анотованого хендлера → `@ts-expect-error`.
- [x] **2.3** Без `ResponseSchema` — будь-який `Payload` компілюється.
- [x] **2.4** `Promise` і синхронний результат компілюються.
- [x] **2.5** Union з `CanonicalErrorResponseSchema` приймає результат `mapControllerError`.
- [x] **2.6** `null`: без `'null'` у схемі → помилка; з `'null'` → компілюється.
- [x] **2.7** `.bind(controller)` перевіряється як стрілка.
- [x] **2.8** Одночасне виведення `body` / `query` / результату не ламається.
- [x] **2.9** Схема з морфом: звірка з `inferIn`, не з `infer`.
- [x] **2.10** `ResponseSchema: Type | undefined` → `Payload` (фіксує межу).
- [x] **2.11** Результат, несумісний з `Payload` (§7.1) → `@ts-expect-error`.
- [x] **2.12** Спільний HTTP/WS-контролер (якщо знайдено в 1.4).

## Етап 3. Генерик у `defineRoute` — GREEN (T2)

- [x] **3.1** `TypedHandler<TContext, TOut>` у `types.d.ts` (bivariance, `TOut | Promise<TOut>`).
- [x] **3.2** `InferResponse<TRes>` (недистрибутивний) + рішення з 1.3.
- [x] **3.3** Третій генерик `TRes` у `DefineRouteInput` і `defineRoute`; `ResponseSchema`
      винести з `Omit<RouteConfig, …>`.
- [x] **3.4** Нові перевірки типів працюють: тести етапу 2 проходять, а `tsc` падає лише на
      відомих розбіжностях T3 (`testPush`, `/support/screenshot/:articleId`, фікстури
      `serialize-routes.spec.ts`). Повний GREEN — у 4.6.
- [x] **3.4a** Контракти helper'а збережено (§4.1): `ResponseSchema` необов'язкова, `TRes` має
      default `undefined`, `defineRoute` повертає `RouteItem`, runtime-поведінка не змінена
      (тіло функції без змін, наявні runtime-тести зелені).
- [x] **3.5** Читабельність помилки (§4.3): зняти реальне повідомлення для аліасу `RouteResponse`.
- [x] **3.6** Прототип маркера з назвою маршруту (`TUrl` + `ResponseMismatch<…>`); порівняти
      повідомлення, перевірити 2.8 і час `tsc`. Обрати варіант, другий прибрати.
- [x] **3.7** Зберегти фактичне повідомлення про помилку для документації (T7).

## Етап 4. Виправлення розбіжностей (T3)

Окремий коміт на кожен пункт.

- [x] **4.1** `testPush`: тип результату → `TestPushResponse`.
- [x] **4.2** Рішення §7.3: спільна `RedirectResponseSchema` чи спеціалізовані схеми. Звірити
      фактичні результати всіх редиректів зі списку 1.5 (OAuth `redirect`/`callback` можуть
      повертати різне, наявні OAuth-схеми — врахувати). Рішення записати в план (§4.4),
      потім створити обрану схему(-и) у `shared`.
- [x] **4.3** `/support/screenshot/:articleId`: схема за рішенням 4.2 замість
      `SupportKnowledgeBaseItemResponseSchema`; звузити тип `getScreenshot`
      (`support-controller.ts:54`).
- [x] **4.4** Перевірити вплив на `serialize-routes` і його споживачів (§7.4).
- [x] **4.5** Фікстури `serialize-routes.spec.ts:99`, `:131`.
- [x] **4.6** `pnpm --filter backend typecheck && pnpm --filter backend test` зелені.

## Етап 5. WebSocket (T4)

- [x] **5.1** Негативні WS-тести типів: невідповідний результат, чужа схема (RED).
- [x] **5.2** Генерик у `define-ws-route.ts` для `WsHandler` за тими самими правилами:
      `inferIn`, недистрибутивний fallback на `Payload`, рішення з 1.3; ті самі контракти,
      що в 3.4a (`ResponseSchema` необов'язкова, default `undefined`, тип результату helper'а
      і runtime без змін).
- [x] **5.3** Виправити знайдені розбіжності на 5 WS-маршрутах.

## Етап 6. Редиректи та `204` (T5)

- [x] **6.1** Для кожного маршруту зі списку 1.5 — схема, що описує реальний результат
      (схема за рішенням 4.2 / union з `'null'`).
- [x] **6.2** Звузити типи відповідних контролерів.

## Етап 7. Продуктивність (T6)

- [x] **7.1** Замір після змін (× 3, медіана) → `progress.md` поряд із 0.4.
- [x] **7.2** Оновлена метрика покриття `ResponseSchema` (поряд із 0.5).

## Етап 8. Документація (T7)

- [x] **8.1** `documentation/backend/routing.md`: поле `ResponseSchema`, межа `Type | undefined`,
      фраза про «тип задається окремо» замінена.
- [x] **8.2** Схема редиректу перевіряється лише статично (§7.3).
- [x] **8.3** `documentation/backend/adding-a-feature.md`, `documentation/guide/first-endpoint.md`:
      маршрут звіряє тип контролера; анотацію лишаємо.
- [x] **8.4** Реальне повідомлення про помилку з 3.7.
- [x] **8.5** `pnpm docs:build && pnpm docs:verify`.

## Етап 9. Definition of Done (T8)

- [x] **9.1** `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- [x] **9.2** `CI=1 pnpm --filter frontend test:e2e`.
- [x] **9.3** Мутаційна перевірка: чужа схема в маршруті → `tsc` падає (HTTP і WS); відкат.
- [ ] **9.4** Evidence у `progress.md`; PR гілки; feat-050 → `done` у `feature_list.json` через PR у `main`.

## Підсумок реалізації (2026-10-30)

- 3.6: маркер з назвою маршруту в повідомленні не з'являється (TypeScript відкидає невикористаний параметр аліасу) — відкинуто; помилка й так стоїть на рядку `handler:` маршруту.
- 4.2: обрано спеціалізовану `SupportScreenshotResponseSchema`; OAuth-схеми вже відповідають контролерам.
- 9.4: evidence у `progress.md`; лишилось злиття PR і feat-050 → `done`.
