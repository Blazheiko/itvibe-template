# Runtime-валідація відповідей бекенда за `ResponseSchema`

> Статус: план (не реалізовано). Дата: 2026-10-29.

## 1. Задача

У маршрутах (`packages/backend/src/app/routes/http-routes.ts` — 61 маршрут, `ws-routes.ts` — 5)
вже оголошено `ResponseSchema` (ArkType-схеми з `shared/responses`). Зараз вона використовується
тільки для документації (`serialize-routes.ts` → `/doc/routes`) та в окремих unit-тестах. У
рантаймі відповідь контролера ніяк не перевіряється.

Потрібно додати env-прапор, який перемикає поведінку:

| Режим    | Значення env                 | Поведінка при невалідній відповіді                                      |
| -------- | ---------------------------- | ----------------------------------------------------------------------- |
| `strict` | `RESPONSE_VALIDATION=strict` | Не віддавати payload, повернути `500 internal_error`, залогувати деталі |
| `log`    | `RESPONSE_VALIDATION=log`    | Віддати відповідь як є, залогувати `warn` з деталями помилки            |
| `off`    | `RESPONSE_VALIDATION=off`    | Перевірку не виконувати взагалі (одне порівняння на запит, див. §3.3)   |

## 2. Поточний стан (що знайдено в коді)

- `RouteItem.ResponseSchema?: BaseType` — `packages/backend/src/vendor/types/types.d.ts:260`.
- `router.ts:18,35` прокидає схему в нормалізований `RouteItem` — вона вже доступна в рантаймі.
- HTTP: результат хендлера пишеться в `responseData.payload` у `server.ts:596`, далі
  `sendResponse()` (`server.ts:281`). Точка вставки — між ними.
- WS: `ws-api-dispatcher.ts:98` — `responseData.data = await handler(context)`.
- Схеми часто мають форму `type.or(success, CanonicalErrorResponseSchema)`, тобто описують і
  помилкові відповіді контролера.
- Схеми відповідей **не** використовують `'+': 'reject'` (на відміну від частини request-схем у
  `shared/src/schemas`), тож зайві поля ArkType за замовчуванням ігнорує.
- Конфіги env живуть у `packages/backend/src/config/*.ts` з `Object.freeze` + хелпери
  `parseBoolean`/`nonEmpty`; приклад конфігу з enum і `configError` — `config/logging.ts`.

## 3. Аналіз впливу

### 3.1 Якість коду — позитивний ефект

- **Контракт стає виконуваним.** Зараз `ResponseSchema` може тихо розійтися з реальною
  відповіддю (рефакторинг трансформера, нове поле, `null` замість `undefined`) — фронтенд
  дізнається про це в проді. З `strict` у dev/CI/e2e такі розбіжності ловляться одразу.
- **E2E та інтеграційні тести перевіряють контракт без окремих асертів** (як у
  `llm-usage-controller.spec.ts`) — але лише для тих маршрутів і гілок відповідей, які тести
  реально виконують і які підлягають перевірці (§4.3.1). Повноти тестового покриття механізм
  не забезпечує.
- **Межа гарантії: перевіряється об'єкт, який повернув хендлер, до JSON-серіалізації**, а не
  JSON на дроті. Це різні речі: напр. `PushSubscriptionSchema`
  (`shared/src/responses/push-subscription-controller.ts:20`) очікує `Date`, а клієнт отримує
  ISO-рядок. Тому `/doc/routes` описує форму об'єкта контролера, і ця перевірка не робить
  документацію автоматично точною щодо wire-формату. Узгодження схем із JSON-форматом
  (`Date` → `string`) — окремий follow-up (§7).
- Ризик: у перший запуск у `strict` вилізе пачка існуючих розбіжностей. Це не регресія, а
  виявлений борг — тому впроваджувати через `log` (див. §6).

### 3.2 Безпека — помірно позитивний ефект, з застереженнями

Плюси:

- **Перший етап виявляє лише порушення форми відповіді і НЕ захищає від витоку зайвих полів.**
- **Захист від витоку даних** (password hash, токени, внутрішні id, PII) можливий _тільки якщо_
  схема відкидає або вирізає зайві ключі. З поточними схемами (undeclared keys ігноруються)
  витік **не** буде виявлено. Тому план включає опційне «вирізання» (§4.4) або перехід
  response-схем на `'+': 'delete'`/`'reject'`.
- `strict` реалізує fail-closed: краще 500, ніж відповідь непередбаченої форми.

Ризики, які треба закрити:

- **Витік деталей валідації клієнту.** У `strict` клієнт отримує тільки канонічний
  `internal_error` без `messages`/`issues` — деталі тільки в лог.
- **Витік PII в логи.** Лог помилки не повинен містити весь payload: тільки шляхи
  (`issue.path`), очікуваний тип і код помилки, **без** `actual`-значень (див. §4.2). Інакше режим `log`
  перетворює логи на сховище персональних даних.
- **DoS / вартість CPU.** Валідація великих масивів (списки, історії) на кожен запит —
  відчутна вартість. `off` має бути мінімальним (рішення приймається один раз при
  реєстрації маршруту, на запит лишається одне порівняння), а для `log` — можливий sampling (§4.5).
- **Шум у логах.** Одна зламана схема на гарячому маршруті = тисячі однакових warn. Потрібен
  rate-limit/дедуплікація логів по `route`.
- **Неправильна мутація.** ArkType-схема з морфами (`.pipe`) повертає _перетворене_
  значення. Ми **не** підміняємо payload результатом валідації (окрім явного режиму
  вирізання), щоб перевірка не змінювала поведінку.

### 3.3 Продуктивність

- `off` — мінімальні, але не нульові витрати: одна перевірка `route.responseCheck !== null`
  (поле завжди заповнене, див. §4.2)
  на запит.
- `log`/`strict` — O(розмір відповіді) на запит. Заміряно в T9 (методика й таблиця по
  режимах — `documentation/backend/response-validation.md`): для валідних списків перевірка
  займає 3–5% від `JSON.stringify` тієї ж відповіді; для маленьких відповідей частка більша
  (`/ping` — близько половини, абсолютно десятки наносекунд); невалідна відповідь коштує
  приблизно як серіалізація.

### 3.4 Рекомендовані значення за середовищем

| Середовище                        | Значення                                                                   |
| --------------------------------- | -------------------------------------------------------------------------- |
| local dev, `manual-test`, CI, e2e | `strict`                                                                   |
| staging                           | `strict` або `log`                                                         |
| production                        | `log` (з sampling) або `off`; `strict` — тільки після періоду чистих логів |

Дефолт, якщо змінна не задана: `strict` для не-production, `off` для `isProductionLike`.

## 4. Дизайн

### 4.1 Конфіг

Новий файл `packages/backend/src/config/response-validation.ts` за зразком `config/logging.ts`:

```ts
export const RESPONSE_VALIDATION_MODES = ['strict', 'log', 'off'] as const
export type ResponseValidationMode = (typeof RESPONSE_VALIDATION_MODES)[number]

export default Object.freeze({
    mode, // з RESPONSE_VALIDATION, дефолт залежить від isProductionLike
    sampleRate, // RESPONSE_VALIDATION_SAMPLE_RATE, 0..1, дефолт 1
    configError, // невалідне значення → validateRuntimeConfig() зупиняє старт
})
```

Невалідне значення **не** падає мовчки на дефолт — старт зупиняється (як із `LOG_LEVEL`).

### 4.2 Модуль валідації

`packages/backend/src/vendor/utils/validation/validate-response.ts`:

```ts
export type ResponseCheck = (
    payload: unknown,
    meta: { route: string; requestId: string },
) => { ok: true } | { ok: false } // у strict: викликаючий код відправляє 500

export function createResponseCheck(
    schema: BaseType | undefined,
    config: { mode: ResponseValidationMode; sampleRate: number },
): ResponseCheck | null
```

- Повертає `null`, якщо `mode === 'off'` або схеми немає → у гарячому шляху лише
  `if (route.responseCheck !== null)` (одне порівняння, не «нуль»).
- Створюється **один раз** у `router.ts` при нормалізації маршруту і кладеться в
  `RouteItem.responseCheck`. Поле **обов'язкове** в нормалізованому маршруті
  (`responseCheck: ResponseCheck | null`, без `?`): `router.ts` завжди записує або функцію,
  або явний `null`, тож `undefined` у гарячому шляху неможливий і перевірка `!== null`
  коректна. Конфіг маршруту з `http-routes.ts` це поле не задає — для цього вводиться окремий
  тип `NormalizedRouteItem extends RouteItem`, який приймають `server.ts` і
  `ws-api-dispatcher.ts`. Тест: кожен маршрут після нормалізації має `responseCheck !== undefined`.
- Валідує `schema(payload)`, перевіряє `instanceof type.errors`.
- Логує через `logger` з полями `{ route, requestId, mode, issues: summarize(errors) }`, де
  `summarize` дає `path`, `expected`, `code` і **без** `actual`-значень (захист PII).
- Дедуплікація: не частіше ніж 1 лог на маршрут за N секунд + лічильник пропущених.

### 4.3 Точки інтеграції

**Що перевіряється:** об'єкт, який повернув хендлер, до серіалізації (див. §3.1).

#### 4.3.1 Політика HTTP-статусів

Головний критерій — **хендлер фактично виконався**, а не код статусу. Статус хендлера не
фільтрує перевірку: напр. `/ready` законно повертає `503 { status: 'unavailable' }`
(`main-controller.ts:23`), і це описано в його власній схемі.

| Випадок                                                                                                                                                                        | Перевіряти?                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Хендлер не викликався (middleware зупинив ланцюжок: 401/403/429/CSRF, помилки валідації запиту)                                                                                | Ні                            |
| Хендлер кинув виняток → `handleError`                                                                                                                                          | Ні (це не відповідь хендлера) |
| Хендлер виконався, тіло буде відправлене (будь-який статус, включно з 4xx/5xx/503)                                                                                             | **Так**                       |
| Тіла не буде — ті самі правила, що в `sendResponse` (`server.ts:286`): 3xx (включно з 304 і OAuth-редиректами), 204, 205, 2xx з `null`/`undefined` payload (зокрема 200 → 204) | Ні                            |

Правило «тіла не буде» виносимо в одну функцію `hasResponseBody(status, payload)`, яку
використовують і `sendResponse`, і перевірка — щоб політики не розійшлися.

- `strict` + невалідно → `responseData.status = 500`, `payload =` канонічний
  `{ status: 'error', code: 'internal_error', message: 'Internal server error' }`.
- **Політика заголовків при заміні на 500:** `responseData.headers` (усі заголовки, які
  виставили хендлер/middleware) **очищаються повністю** — вони могли описувати відхилений
  payload (`Content-Length`, `Content-Encoding`, `ETag`, `Content-Disposition`,
  `Cache-Control` тощо). Security-, CORS- і `Cache-Control` API-заголовки після цього
  виставляє `sendResponse` як для будь-якої 500. `responseData.cookies` **не** чіпаються:
  стан сесії (логін/логаут, `beforeSend`) уже змінено на сервері, і cookie мають йому
  відповідати. Тест: хендлер ставить `ETag` і `Content-Disposition` + невалідний payload →
  у 500 цих заголовків немає, а `set-cookie` сесії є.

#### 4.3.2 WS-відмова

У `ws-api-dispatcher.ts:98` хендлер уже записав результат у `responseData.data`. У `strict` +
невалідно потрібно **атомарно**:

1. встановити `responseData.data = null` (тип `WsResponseData.data: Payload | null` не
   змінюється — так само робить rate-limit відповідь; відхилений payload не потрапляє в envelope);
2. встановити `responseData.status = 'error'`;
3. встановити `responseData.error = createWsErrorEnvelope('internal_error', 'Internal server error')`.

Критерій приймання **для цієї гілки**: envelope має `status: 'error'`, `error.code:
'internal_error'` і `data: null`. Інші наявні помилкові відповіді не змінюються: rate-limit
уже має `data: null`, а validation_failed і not_found зараз залишають початкове `data: {}`
(`ws-api-dispatcher.ts:41`). Їх уніфікація — поза межами цієї фічі.

**Межа охоплення WS:** перевіряється лише пряма відповідь хендлера. Повідомлення, які хендлер
надсилає пізніше асинхронно (напр. support-хендлери повертають підтвердження і запускають
фонову роботу — `controllers/ws/support-controller.ts:18`), а також broadcast — не
перевіряються. Це окрема задача, якщо знадобиться.

- **Sentry**: у `strict` і `log` — `captureMessage` з тегом `response_validation`, якщо Sentry
  увімкнено (одна подія на маршрут через дедуплікацію).

### 4.4 Опційно: вирізання зайвих полів (security hardening)

Окремий крок, не в першому PR: перевести response-схеми на `'+': 'delete'` і в `strict`
віддавати **очищений** результат схеми. Це перетворює `ResponseSchema` на allow-list полів і
реально блокує витоки. Вимагає аудиту всіх схем на морфи.

### 4.5 Sampling

`RESPONSE_VALIDATION_SAMPLE_RATE` (0..1) застосовується тільки в режимі `log`. У `strict`
перевіряється кожна відповідь (інакше 500 стає недетермінованим).

## 5. План реалізації (кроки)

1. **feature_list.json** — додати `feat-0XX: runtime response validation` через PR у `main`
   (згідно `AGENTS.md`), створити гілку.
2. **Конфіг** — `config/response-validation.ts` + `*.spec.ts` (парсинг, дефолти за
   середовищем, невалідне значення → `configError`); підключити в `validateRuntimeConfig()`.
3. **`.env.example`** — додати `RESPONSE_VALIDATION` і `RESPONSE_VALIDATION_SAMPLE_RATE` з
   коментарем.
4. **Модуль** `validate-response.ts` + unit-тести: valid/invalid/off/no-schema, формат логу
   без значень, дедуплікація. Sampling: `log` + rate `0` → схема не викликається;
   `log` + rate `1` → викликається завжди; `strict` + rate `0` → перевіряє кожну відповідь
   (strict не залежить від sampling).
5. **Типи** — `NormalizedRouteItem` з обов'язковим `responseCheck: ResponseCheck | null` у
   `types.d.ts`; побудова в `router.ts` + тест, що поле заповнене для всіх маршрутів.
6. **HTTP-інтеграція** у `server.ts`: винести `hasResponseBody()` зі `sendResponse` і
   використати в перевірці. Тести у стилі `http-validation.spec.ts` за таблицею §4.3.1:
    - невалідна відповідь → 500 у strict, оригінальна відповідь + warn у log, схема не
      викликається в off;
    - хендлер повертає валідний `503` (`/ready`) → перевіряється і проходить;
    - middleware зупинив запит (401/429) → перевірка не викликається;
    - 3xx (OAuth-редирект), 204, 205, порожній 200 → перевірка не викликається, зберігається
      поточна поведінка відправлення (включно з 200 → 204);
    - strict-заміна на 500 очищає заголовки хендлера (`ETag`, `Content-Disposition`), але
      зберігає cookie сесії (§4.3.1).
7. **WS-інтеграція** у `ws-api-dispatcher.ts` + тест у `ws-validation.spec.ts`: у strict
   envelope містить `status: 'error'` + `error.code: 'internal_error'` і `data: null`; у `log` — оригінальний envelope
   без змін + warn; в `off` — схема не викликається.
8. **Прогон усіх тестів і e2e у `strict`** — виправити знайдені розбіжності схем/контролерів
   (окремими комітами; можливо, окремою фічею, якщо їх багато).
9. **Бенчмарк** великого list-маршруту в `log`/`strict` vs `off`; записати результат у
   `progress.md`.
10. **Документація** — нова сторінка `documentation/backend/response-validation.md` (або
    розділ у сторінці про маршрути/env), сайдбар у `.vitepress/config.ts`, `KEY_PAGES` у
    `scripts/verify-dist.mjs`; `pnpm docs:build && pnpm docs:verify`.
11. **DoD** — `pnpm typecheck`, `pnpm lint`, `pnpm test`, e2e; evidence у `progress.md`.
12. **Follow-up (окрема фіча)** — `'+': 'delete'` для response-схем і віддача очищеного
    payload (§4.4).

## 6. Розкатка

1. Злити з дефолтом `strict` у dev/CI, `off` у production.
2. Увімкнути `log` у staging/production, зібрати й виправити всі warn.
3. Після періоду без warn — розглянути `strict` на staging, далі за рішенням команди.

## 7. Відкриті питання

- Чи потрібен per-route override (наприклад, `responseValidation: 'off'` для важких
  маршрутів експорту)?
- Узгодити response-схеми з JSON-форматом (`Date` → ISO-рядок), щоб `/doc/routes` описував
  wire-формат. Варіант: валідувати `JSON.parse(JSON.stringify(payload))` — дорожче, тому
  лише як опція для CI.
- Чи потрібна перевірка асинхронних WS-повідомлень і broadcast (§4.3.2)?

Закрито після рев'ю:

- перевіряти все, що повернув хендлер, незалежно від статусу (§4.3.1);
- вирізання зайвих полів — окрема фіча (§4.4, крок 12);
- WS-відмова використовує `data: null`, тип не змінюється (§4.3.2).
