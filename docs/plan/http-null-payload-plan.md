# План: відповідь при `payload === null` (п. 13)

> **Статус:** виконано у feat-008, п. 13 (PR #46, merge `8ee410b`, 2026-10-23).

Пункт 13 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Фіча: **feat-008 «HTTP Body Fixes»** (разом із п. 12 і 14).
Шляхи відносно `packages/backend/`, якщо не вказано інше.

## Проблема

### 1. `payload === null` дає тіло `String(status)`

`sendResponse` (`src/vendor/start/server.ts`) обирає тіло так:

| Умова              | Тіло                               | `Content-Type`     |
| ------------------ | ---------------------------------- | ------------------ |
| редирект 3xx       | порожнє                            | не ставиться       |
| `payload !== null` | `makeJson(payload)`                | `application/json` |
| `payload === null` | `String(status)`: `"200"`, `"403"` | `application/json` |

`"200"` формально валідний JSON (число), але такого формату відповіді немає в жодному контракті. Для 4xx/5xx тіло не має канонічної форми помилки `{ status: "error", code, message }`, яку дає `sendErrorResponse`.

### 2. `payload === undefined` дає порожнє тіло з `application/json` (поза початковим п. 13)

Handler без `return` (`async () => { … }`) повертає `undefined`. Перевірка `undefined !== null` проходить, `makeJson(undefined)` повертає `undefined`, `res.end(undefined)` віддає **200** з `Content-Type: application/json` і порожнім тілом. `response.json()` на клієнті кидає помилку. Фронтенд (`packages/frontend/src/utils/base-api.ts`, `parseResponseJson`) обгортає це в `try`, сторонні клієнти — ні.

### 3. 204 і 205 можуть піти з тілом

Якщо handler ставить `responseData.status = 204` (або `205`) і повертає об'єкт, тіло записується. За [RFC 9110 §15.3.5](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.5) і [§15.3.6](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.6) ці відповіді тіла не мають.

`304` уже йде без тіла: він потрапляє в наявну гілку всіх 3xx. Тут це регресійна гарантія, а не виправлення ([§15.4.5](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.4.5)).

### Хто зараз дає `null`

`createResponseData` (`src/vendor/utils/network/response-data.ts`) стартує з `payload: {}`. Rate limit, `auth_guard`, `csrf_guard`, `admin_guard`, `applyAppErrorStatus` ставлять `status` разом із `payload`, тому гілку `null` не проходять. `null` чи `undefined` з'являється лише з `responseData.payload = await route.handler(context)`. У контролерах `return null` є тільки у внутрішніх helper-функціях (`resolveUserId`, `getUserId`), handler після них повертає `mapControllerError(...)`. Живих маршрутів із `null`/`undefined` не знайдено: це пастка для нового коду. Перед реалізацією перевірити ще раз (крок 1).

## Рішення

Правило в `sendResponse`, «порожній payload» = `null` або `undefined`:

| Ситуація                                                        | Відповідь                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 3xx (включно з 304)                                             | без змін: без тіла                                                              |
| статус 204 або 205, заданий явно                                | той самий статус, без тіла, навіть якщо payload є                               |
| статус 200 (будь-який, зокрема явно заданий) і порожній payload | **204 No Content**, без тіла                                                    |
| інший 2xx (201, 202, …) і порожній payload                      | **той самий статус**, без тіла                                                  |
| 4xx/5xx і порожній payload                                      | канонічне тіло помилки `{ status: "error", code, message }`, `application/json` |
| інакше                                                          | без змін: `makeJson(payload)`, `application/json`                               |

«Порожній» — лише `null` і `undefined`. `false`, `0` і `""` — дані: вони серіалізуються в JSON, як зараз.

**Чому 204 лише для 200.** `ResponseData` не відстежує, чи статус присвоєно явно, тому правило дивиться лише на значення: будь-який 200 з порожнім payload стає 204. Для 200 відповідь 204 точно означає «успіх, тіла немає» і не змушує клієнта розбирати JSON; 200 з `null` виглядає як відповідь із даними. Інший 2xx несе свій зміст: `202` — «прийнято до обробки», `201` — «створено», і заміна на 204 цей зміст стирає. Тому інший 2xx зберігається, а прибирається лише тіло: RFC дозволяє 201/202 без вмісту. Фронтенд порожнє тіло вже витримує.

**Заголовки у відповідях без тіла.** Cookies, security-заголовки, CORS і `responseData.headers` пишуться в усіх випадках, як зараз: logout чи інша дія без тіла може ставити cookie у 204. Виняток один: коли тіла немає, `sendResponse` сам не пише `Content-Type` **і пропускає `Content-Type` з `responseData.headers`** (назва без урахування регістру). Так правило «у відповіді без тіла немає `Content-Type`» однозначне і не залежить від контролера. Для 3xx поведінка та сама: зараз `Content-Type` з `responseData.headers` у редирект потрапляє, після змін — ні.

**`code` і `message` для 4xx/5xx.** `code` береться зі спільного контракту `ErrorCode` (`packages/shared/src/errors/error-codes.ts`), бо фронтенд приймає лише відомі коди (`packages/frontend/src/utils/response-normalizer.ts`, `readPayloadCode`). Явна таблиця статус → код:

| Статус    | `code`                   |
| --------- | ------------------------ |
| 400       | `bad_request`            |
| 401       | `unauthorized`           |
| 403       | `forbidden`              |
| 404       | `not_found`              |
| 409       | `conflict`               |
| 413       | `payload_too_large`      |
| 415       | `unsupported_media_type` |
| 422       | `validation_failed`      |
| 429       | `rate_limited`           |
| 503       | `service_unavailable`    |
| інший 4xx | `bad_request`            |
| інший 5xx | `internal_error`         |

`csrf_invalid` за статусом не вгадується (CSRF-відмова — теж 403), тож для 403 лишається `forbidden`. `message` — reason phrase з `STATUS_CODES` (`node:http`), як у `getHttpStatusLine` (`src/vendor/utils/network/http-response-handlers.ts`); для статусу без reason phrase — `"Error"`. Таблицю тримає helper `buildStatusErrorBody`; `sendErrorResponse` не змінюється.

**`payload` у типах.** `HttpHandler` повертає `HandlerReturn = Payload | Promise<Payload>` (`src/vendor/types/types.d.ts`): `null` входить у `Payload`, `undefined` — ні, тож handler без `return` — помилка типів. `undefined` все одно обробляється в runtime, бо його можна отримати через приведення типу. Тип не звужуємо (не прибираємо `null`): `null` — штатний спосіб сказати «даних немає».

## Кроки

1. **Аудит.** Пройти всі handler'и з `src/app/routes/http-routes.ts` і перевірити, що жоден не повертає `null`/`undefined` на успішному шляху (інакше його відповідь зміниться з 200 на 204). Результат записати в `progress.md`. Якщо такі є — вирішити до реалізації: явний payload у handler або прийняти 204.
2. **`sendResponse`** (`server.ts`):
    - `isEmptyPayload = payload === null || payload === undefined`;
    - `noBody = isRedirect || status === 204 || status === 205 || (status 2xx && isEmptyPayload)`; статус стає 204 лише для `200` з порожнім payload;
    - `content-type` пишеться лише коли тіло є; при `noBody` заголовок `content-type` з `responseData.headers` пропускається;
    - 4xx/5xx з порожнім payload → `makeJson(buildStatusErrorBody(status))`.
3. **Helper** `buildStatusErrorBody(status)` поруч із `getHttpStatusLine` у `http-response-handlers.ts`, з unit-тестом: кожен рядок таблиці, інший 4xx (`418`) → `bad_request`, інший 5xx (`502`) → `internal_error`, статус без reason phrase (`499`) → `message: "Error"`; кожен `code` — член `ErrorCodeValues`.
4. **Тести через зареєстрований HTTP-handler**, за зразком `src/vendor/start/http-body-methods.spec.ts` (фейковий `uWebSockets.js` `App`, справжні `sendResponse` і `writeHeader`), новий файл `src/vendor/start/http-empty-payload.spec.ts`:
    - **нова поведінка:**
        - handler повертає `null` → `204 No Content`, тіло порожнє, `content-type` не записано;
        - handler повертає `undefined` → те саме;
        - `status = 201` і `null` → 201 без тіла і без `content-type`; так само `202`;
        - `status = 204` і об'єкт → 204 без тіла; так само `205`;
        - `status = 403` і `null` → 403, `{ status: "error", code: "forbidden", message: "Forbidden" }`;
        - `status = 500` і `null` → 500, `code: "internal_error"`; `status = 418` і `null` → `code: "bad_request"`;
        - `null` і `responseData.headers` з `Content-Type: text/plain` → 204 без `content-type`;
        - те саме з назвою в іншому регістрі (`content-type`, `CONTENT-TYPE`) → 204 без `content-type`;
        - `status = 302` і `responseData.headers` з `Content-Type: text/html` → 302 без тіла і без `content-type`;
        - `status = 304`, об'єкт і `Content-Type: application/json` у `responseData.headers` → 304 без тіла і без `content-type`;
        - cookie і `null` → 204 і `set-cookie` записано;
    - **регресія** (можуть проходити й до змін):
        - об'єкт → 200 з JSON; `false`, `0`, `""` → 200 з `false`, `0`, `""` у JSON;
        - 302 → без тіла; `status = 304` і об'єкт → без тіла.

    Негативний контроль: з `server.ts` із `main` мають падати всі тести блоку «нова поведінка»; регресійні — ні.

5. **Документація** (в тому ж PR, за `AGENTS.md`):
    - `documentation/backend/request-lifecycle.md`, крок 8 «Відповідь»: замінити «`String(status)`, якщо payload `null`» на таблицю з рішення;
    - `documentation/backend/adding-a-feature.md` (розділ про handler): що повертати, якщо тіла немає, і що тоді буде 204;
    - позначити п. 13 виправленим у `code-issues-found-during-docs.md`.
6. **Перевірка:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm docs:build && pnpm docs:verify`.
   Ручна перевірка на запущеному backend (`curl -i`) з тимчасовими маршрутами, які не комітяться:
    - handler повертає `null` → `HTTP/1.1 204 No Content`, без `Content-Type`, без тіла;
    - `status = 202`, `null` → `HTTP/1.1 202 Accepted` без тіла;
    - handler без `return`, статус за замовчуванням → `HTTP/1.1 204 No Content`, без `Content-Type`, без тіла;
    - `status = 403`, `null` → 403 з канонічним тілом;
    - наявний маршрут (`GET /api/...` з даними) → 200 з JSON, як раніше.

## Знайдено під час реалізації

- **`Content-Length` від контролера.** У відповіді без тіла `sendResponse` пропускає з `responseData.headers` не лише `Content-Type`, а й `Content-Length` (без урахування регістру): framing задає uWS, і заголовок контролера суперечив би йому, а в 204 його бути не може. Знайдено в рев'ю `74b784c`.
- **`Content-Length: 0` у 204.** `res.end()` у uWS завжди пише `Content-Length`, а [RFC 9110 §8.6](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.6) забороняє його в 204; у 304 він описував би представлення, а не порожнє тіло. Для 204 і 304 `sendResponse` викликає `res.endWithoutBody()`; 201/202/205/3xx без тіла лишаються з `Content-Length: 0`. Перевірено `curl -v`: заголовка немає, з'єднання перевикористовується.
- **Аудит (крок 1).** Тимчасово прибрано `null` з `HandlerReturn` (`src/vendor/types/types.d.ts`): `tsc` для коду поза `*.spec.ts` чистий, отже жоден handler на успішному шляху не повертає `null`; `undefined` і так відсікається типом. Відповіді чинних маршрутів не змінюються.

## Поза обсягом

- Middleware повертає `false`, не змінивши статус: відповідь — `{}` з 200, бо payload за замовчуванням `{}`. Окрема дрібна проблема.
- Звуження типу результату `HttpHandler` (див. рішення).
- Тіла WS-відповідей (`ws-api-dispatcher.ts`): інший транспорт і формат.
- П. 14 (прогалини body limits) — окремим кроком feat-008.

## Прийняті рішення

- Порожній payload (`null` або `undefined`) у будь-якому 200 → 204; в іншому 2xx — той самий статус без тіла. `false`, `0`, `""` — дані.
- 204, 205 і 3xx (включно з 304) ніколи не мають тіла; у відповіді без тіла немає `Content-Type`, зокрема з `responseData.headers`.
- Порожній payload у 4xx/5xx → `{ status: "error", code, message }`, `code` — зі спільного `ErrorCode` за явною таблицею статусів.
