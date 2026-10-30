# feat-047: схеми відповідей описують JSON, який отримує клієнт

> Статус: план (не реалізовано). Дата: 2026-10-30. Залежить від feat-044, feat-046.

## 1. Задача

Перевірка відповідей (feat-044, feat-046) звіряє зі схемою **об'єкт до серіалізації**, а клієнт
отримує JSON після `makeJson` (`vendor/utils/helpers/json-handlers.ts`). Там, де вони
розходяться, схема описує не те, що бачить клієнт:

- `Date` у схемі → клієнт отримує ISO-рядок;
- `bigint` у схемі → клієнт отримує рядок (`makeJson` перетворює `bigint` на `toString()`).

Наслідки: `/doc/routes` і playground показують формат, якого немає в мережі; фронтенд пише
власні типи навмання; TypeScript-типи з `shared/responses` (`typeof Schema.infer`) брешуть
клієнту (`Date` замість `string`).

Мета: для кожного маршруту з `ResponseSchema` схема описує **рівно той JSON, який отримує
клієнт** — схема без `Date` і `bigint`, контролер повертає вже серіалізовані значення. Охорона в
тестах не дає повернути `Date` / `bigint` у схему.

## 2. Що показав інвентар

Обхід `ResponseSchema.json` усіх 60 HTTP і 4 WS маршрутів (2026-10-30). Розбіжність — **6
маршрутів**, усі з рядками БД без transformer'а:

| Маршрут                                   | Поля                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `GET /push-subscriptions`                 | `subscriptions[].notificationLogs[].id: bigint`, `…sentAt: Date`                 |
| `GET /push-subscriptions/:subscriptionId` | `data.notificationLogs[].id`, `userId`, `subscriptionId: bigint`; `sentAt: Date` |
| `GET /push-subscriptions/:id/logs`        | `data[].id`, `userId`, `subscriptionId: bigint`; `sentAt: Date`                  |
| `GET /push-subscriptions/:id/statistics`  | `data.statistics.createdAt`, `lastUsed: Date`                                    |
| `GET /prompts`                            | `data[].id: bigint`; `createdAt`, `updatedAt: Date`                              |
| `GET /prompts/:type`                      | `data.id: bigint`; `createdAt`, `updatedAt: Date`                                |

Решта маршрутів уже отримує рядки від transformer'ів (`userTransformer`,
`pushSubscriptionTransformer`, `rowToData` knowledge base, історія чату).

Також:

- `PushSubscriptionSchema`, `PushSubscriptionLogSchema`, `PushSubscriptionLogSummarySchema` у
  `shared/responses/push-subscription-controller.ts` описують рядки БД (`Date`) і ніде не
  використовуються — ні маршрутами, ні фронтендом.
- Ручний тип фронтенду `PushSubscriptionStatistics` (`frontend/src/utils/api.ts:254`,
  `total_sent`, `total_delivered`, …) не має нічого спільного з реальною відповіддю. Викликів
  `getSubscriptionStatistics` у компонентах немає; логи й prompts фронтенд не читає.
- ArkType `number` приймає `Infinity`, а `JSON.stringify` пише `null` — ще одна (поки
  теоретична) розбіжність. `NaN` і `undefined` в optional-полі ArkType уже відхиляє.

## 3. Аналіз впливу

### 3.1 Позитивний

- `/doc/routes`, playground і типи з `shared/responses` описують реальний JSON — фронтенд може
  брати типи звідти замість ручних.
- Перевірка feat-046 лишається без морфів: швидкий шлях (відправити вихідний об'єкт) коректний,
  і застереження з опису feat-047 про його перегляд знімається (§4.4).
- Дати й ідентифікатори серіалізуються в одному місці (transformer), як уже зроблено для users,
  push-subscriptions і knowledge base.

### 3.2 Мінуси та ризики

- **Формат відповіді не змінюється** для клієнта (він і так отримував рядки) — змінюються лише
  схеми й TypeScript-типи. Ризик — код бекенда, що читає ці типи як `Date` (контролери,
  тести); його знайде `tsc` (feat-050 звіряє результат контролера зі схемою).
- **Ручне форматування дат** у кількох місцях — ризик різних форматів (`toISOString()` проти
  luxon `toISO()` з часовим поясом). Потрібне одне правило (§4.2).

### 3.3 Чого не дає

- Не уніфікує назви полів (`created_at` у `pushSubscriptionTransformer` проти `createdAt` в
  інших) — це зміна контракту для фронтенду, окреме рішення (§6).
- Не генерує типи фронтенду автоматично — лише виправляє ті, що зачеплені (§4.5).

## 4. Дизайн

### 4.1 Серіалізація в transformer'ах, не морфи в схемі

Значення перетворюються **в бекенді до повернення з контролера**; схема описує результат
(`'string'`). Морфи `Date → string` у схемах не вводяться.

Чому не морфи (`type('Date').pipe((d) => d.toISOString())`):

- швидкий шлях feat-046 відправляє вихідний об'єкт і відкидає результат схеми — з морфами формат
  залежав би від того, чи були зайві ключі; довелося б завжди відправляти результат `reject`
  (копія на кожну відповідь, вартість);
- `onDeepUndeclaredKey('delete')` теж морф: union з морфами й гілками, що перекриваються, ArkType
  відхиляє на старті (знайдено у feat-046 на `ResetPasswordResponseSchema`);
- JSON Schema для `/doc/routes` з морфа описує **вхід** (`Date`), тобто знову не той формат;
- проєкт уже серіалізує в transformer'ах.

### 4.2 Правило формату

- `bigint` id → `String(id)` (як `userTransformer`, `pushSubscriptionTransformer`).
- `Date` → `date.toISOString()` (UTC, `Z`), `null` лишається `null`. Luxon `toISO()` у
  наявних transformer'ах дає той самий формат лише в UTC-процесі; уніфікацію наявних
  transformer'ів на `toISOString()` — окремим кроком T5 з тестом формату.
- Схеми: `'string'` для id і дат (`'string | null'` для nullable). Без `string.date.iso` —
  перевірка regex на кожну дату на кожну відповідь не варта вартості; формат гарантує
  transformer і його тест.

### 4.3 Нові transformer'и

- `pushNotificationLogTransformer` (`app/transformers/`): рядок логу й summary → id-рядки,
  `sentAt` ISO; `messageData` / `responseData` без змін (виняток allow-list з feat-046).
- `promptTransformer`: `PromptRow` → id-рядок, дати ISO.
- Статистика (`push-subscription-statistics-service.ts`): `lastUsed`, `createdAt` → ISO.
- Сервіси повертають уже серіалізовані типи; схеми в `shared/responses` оновлюються під них.

### 4.4 Охорона

Питання з опису feat-047 «чи перевіряти в CI `JSON.parse(JSON.stringify(payload))`»:
**ні**, замість цього статична охорона — дешевша й ловить причину, а не наслідок:

- тест у `route-access.spec.ts`: жодна схема маршруту не містить `Date` або `bigint` (обхід
  `schema.json`, той самий, що в інвентарі §2);
- лишається охорона «без морфів» з feat-046 — тепер це свідоме правило, а не тимчасове
  обмеження; опис feat-047 у `feature_list.json` оновити (перегляд швидкого шляху не потрібен);
- під час виконання `Date` чи `bigint` у відповіді проти схеми `'string'` — невідповідність:
  500 у `strict` (тести й e2e), 500 у `log` (feat-046).

Залишок — `Infinity` / `-Infinity` (`number` у схемі, `null` у JSON). Пропозиція: додати в
`inspectPayload` (feat-046) перевірку `Number.isFinite` для чисел у відповіді — невідповідність, 500. Вартість заміряти `bench:response` (межа feat-046: +50 % до перевірки feat-044).

### 4.5 Схеми й типи, які прибрати або виправити

- Видалити `PushSubscriptionSchema`, `PushSubscriptionLogSchema`,
  `PushSubscriptionLogSummarySchema` та їхні типи — не використовуються й описують рядки БД.
  Перед видаленням — `grep` по всіх пакетах.
- Фронтенд: `PushSubscriptionStatistics` в `api.ts` замінити типом з `shared/responses`
  (`GetSubscriptionStatisticsResponse`). Інші ручні типи — лише якщо зачеплені цією фічею.

### 4.6 Зв'язок з іншими фічами

- **feat-046:** без морфів швидкий шлях і тест на ідентичність лишаються як є; записати в опис
  feat-047 і документацію, що правило «без морфів» тепер постійне.
- **feat-050:** після зміни схем `tsc` звірить контролери з `'string'` — це основний детектор
  місць, де ще повертається `Date` / `bigint`.

## 5. Кроки

1. **T0** — PR у `main`: цей план + task list; feat-047 → `in_progress`, опис оновити (без
   перегляду швидкого шляху, §4.4); гілка `feat/wire-format-response-schemas`.
2. **T1** — тести перед зміною:
    - охорона «без `Date` / `bigint` у схемах маршрутів» — червона на 6 маршрутах §2;
    - тести transformer'ів: id → рядок, дата → ISO UTC, `null` → `null`;
    - (якщо §6 вирішено «так») `Infinity` у відповіді → 500 в обох режимах.
3. **T2** — `pushNotificationLogTransformer`, `promptTransformer`, статистика; сервіси й
   контролери повертають серіалізовані значення.
4. **T3** — схеми в `shared/responses` під §4.2; охорона зелена; `tsc` (feat-050) чистий.
5. **T4** — видалити невикористовувані DB-схеми (§4.5).
6. **T5** — наявні transformer'и (`userTransformer`, `pushSubscriptionTransformer`): luxon
   `toISO()` → `toISOString()` з тестом формату, або записати, чому лишаємо (§6).
7. **T6** — фронтенд: тип статистики з `shared` (§4.5); `pnpm --filter frontend typecheck`.
8. **T7** — `inspectPayload`: `Number.isFinite` (якщо прийнято) + `bench:response`.
9. **T8** — документація: `response-validation.md` («Що саме перевіряється»: схема описує
   JSON; правило «без морфів» постійне), `routing.md` (межа `Date`), `validation.md`;
   `pnpm docs:build && pnpm docs:verify`.
10. **T9** — Definition of Done: `pnpm typecheck`, `pnpm lint`, `pnpm test`,
    `CI=1 pnpm --filter frontend test:e2e`; ручна перевірка — `GET /prompts` і
    `GET /push-subscriptions/:id/logs` у `strict`: 200, `/doc/routes` показує `string` для дат;
    evidence у `progress.md`; feat-047 → `done`.

## 6. Рішення (2026-10-30, власник)

- **`Infinity` → 500:** так, `Number.isFinite` в `inspectPayload`, якщо `bench:response` лишається
  в межі feat-046 (+50 % до перевірки feat-044).
- **luxon `toISO()` → `toISOString()`** у наявних transformer'ах: так, з тестом формату.
- **`created_at` / `updated_at` у `pushSubscriptionTransformer`:** не уніфікуємо в цій фічі.
