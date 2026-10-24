# План: методи з тілом запиту і маршрути з `validator` (п. 12)

> **Статус:** виконано у feat-008, п. 12 (PR #46, merge `8ee410b`, 2026-10-23).

Пункт 12 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Фіча: **feat-008 «HTTP Body Fixes»** (разом із п. 13 і 14).
Шляхи відносно `packages/backend/`, якщо не вказано інше.

## Проблема

### 1. `PATCH` не читає тіло

`collectRequestMetadata` у `src/vendor/start/server.ts` задає `hasBody = route.method === "post" || route.method === "put"`.

Решта стеку `PATCH` уже підтримує:

| Місце                                              | Стан                          |
| -------------------------------------------------- | ----------------------------- |
| тип `Method` (`src/vendor/types/types.d.ts`)       | є `"patch"`                   |
| `registerHttpRoute` (`server.ts`)                  | `server.patch(path, handler)` |
| CORS (`src/config/cors.ts`)                        | `PATCH` у `methods`           |
| `csrf_guard` (`src/app/middlewares/csrf-guard.ts`) | `patch` у `UNSAFE_METHODS`    |

Тому `patch`-маршрут з `validator` реєструється і проходить CSRF. Але тіло не читається, а валідація мовчки пропускається, бо `readAndParseBody` валідує лише при `payload !== null`. Handler отримує `payload = null`, а `getTypedPayload` (`src/vendor/utils/validation/get-typed-payload.ts`) кидає `Error("Payload is missing")`. Клієнт бачить **500**. Зараз `patch`-маршрутів немає, тож це пастка для першого такого маршруту.

### 2. `validator` на `GET` / `DELETE` мовчки не працює

Тіла для цих методів не читаються, але `defineRoute` дозволяє оголосити на них `validator`. Результат той самий: `payload = null`, а з `getTypedPayload` — 500.

Зараз таких маршрутів немає. Підрахунок `src/app/routes/http-routes.ts`: `get` — 24 і `delete` — 5, усі без `validator`; `post` — 25 і `put` — 4, усі з `validator`. `delete` перетворюється на `del` у `routeHandler` (`src/vendor/start/router.ts`), реєстрація працює.

### 3. Маршрут з `validator` без `Content-Type` дає 500 (поза початковим п. 12)

`readAndParseBody` повертає `{ payload: null }`, якщо в запиті немає `Content-Type`, і валідацію пропускає. Наприклад, `POST /auth/login` без заголовка доходить до handler з `null`, і там виникає `Error("Payload is missing")`. Клієнт отримує **500**, а в моніторингу з'являється зайва подія. Діри в безпеці немає, бо запит падає, а не проходить, але це помилка клієнта, і відповідь має бути 4xx.

## Рішення

### Методи

| Метод                 | Читає тіло     | `validator`                                                       |
| --------------------- | -------------- | ----------------------------------------------------------------- |
| `post`, `put`         | так            | дозволено                                                         |
| `patch`               | **так** (нове) | дозволено                                                         |
| `get`, `delete`/`del` | ні             | **заборонено**: помилка типів у `defineRoute` і помилка на старті |
| `ws`                  | —              | дозволено, без змін (WS-маршрути мають власний payload)           |

Для `DELETE` тіло свідомо не читається. За [RFC 9110 §9.3.5](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.3.5) вміст запиту `DELETE` не має загальновизначеної семантики, і частина проксі та клієнтів його відкидає. Ідентифікатор того, що видаляється, передається через `:param` або `queryValidator`, як і зараз.

Заборона стосується **конкретно** `get`, `delete` і `del`, а не «будь-якого методу поза `BODY_METHODS`». `routesHandler` обробляє і HTTP-, і WS-маршрути (`src/index.ts`), а WS-маршрути з `validator` — штатний випадок (`src/app/routes/ws-routes.ts`).

### Маршрут з `validator` без `Content-Type` (лише `post`/`put`/`patch`)

Це **контракт API** цього шаблону. RFC його не вимагає: за [RFC 9110 §8.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.3) відсутній `Content-Type` дозволяє отримувачу або вгадати тип, або вважати вміст `application/octet-stream`, але 415 не приписує.

| Запит                                                                               | Результат                                                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| немає `Content-Type`, немає `Transfer-Encoding`, `Content-Length` відсутній або `0` | валідується `{}`, як порожнє JSON-тіло (`readJson("")` → `{}`): обов'язкові поля → **422** зі списком полів; схема без обов'язкових полів пропускає, defaults застосовуються |
| немає `Content-Type`, але є `Transfer-Encoding` **або** `Content-Length > 0`        | **415** `UnsupportedMediaTypeError` з `receivedContentType: null`                                                                                                            |
| `Content-Type` є                                                                    | без змін: перевірка `allowedContentTypes`, ліміт, парсинг, валідація                                                                                                         |

Маршрути без `validator` поводяться як раніше (`payload = null`).

**Framing, а не фактичне тіло.** Умова «є `Transfer-Encoding`» означає, що є framing потенційного тіла, а не що тіло непорожнє: `Transfer-Encoding: chunked` може передати нуль байтів ([RFC 9112 §6.3](https://www.rfc-editor.org/rfc/rfc9112.html#section-6.3)). Свідома політика: без `Content-Type` будь-який framing тіла дає ранній 415 ще до читання, без спроби прочитати й перевірити довжину. Так рішення приймається синхронно, і невідомий вміст не читається. Порожній chunked-запит без `Content-Type` теж отримує 415; це фіксує окремий тест.

**Представлення відсутнього заголовка.** `UnsupportedMediaTypeError` (`src/vendor/utils/network/errors/unsupported-media-type-error.ts`) приймає `receivedContentType: string | null`. Для `null` повідомлення — `Missing Content-Type. Allowed: …`, а `details.receivedContentType` у відповіді 415 і в лозі `warn` — `null`.

### Межі гарантії

Кроки нижче усувають `payload = null` для описаних випадків: `patch`, `get`/`delete` з `validator`, JSON-маршрути без `Content-Type`. Ненульовий payload для **всіх** конфігурацій вони не гарантують: парсер `octet` (`src/vendor/utils/network/http-request-handlers.ts`) повертає `payload: null` і файл у `files`, а `readAndParseBody` тоді пропускає `validator`. Контракт бінарних upload-маршрутів (`allowedContentTypes: ["octet"]` разом із `validator`) лишається поза обсягом.

## Кроки

1. **Методи з тілом.** У `server.ts` винести множину методів, що мають тіло (`BODY_METHODS = new Set(["post", "put", "patch"])`), і рахувати `hasBody` через неї.
2. **Заборона `validator` на `GET` / `DELETE`:**
   - `defineRoute` (`src/app/routing/define-route.ts`): перевантаження або умовний тип, щоб `method: "get" | "delete" | "del"` разом із `validator` давав помилку typecheck;
   - runtime-перевірка в `routeHandler` / `createRoute` (`router.ts`): якщо `method ∈ {get, delete, del}` і є `validator`, то `throw new Error(...)` на старті з `url` і `method`. Вона страхує маршрути, які оминають `defineRoute`. WS-маршрути не зачіпаються.
3. **`validator` без `Content-Type`:**
   - `UnsupportedMediaTypeError`: `receivedContentType: string | null`, повідомлення для `null`;
   - `readAndParseBody`: якщо `meta.hasBody`, є `route.validator` і немає `contentType`, то за наявності `transfer-encoding` або `content-length > 0` кидається `UnsupportedMediaTypeError(null, allowed)`, інакше викликається `validateRoutePayload(route.validator, {})`.
4. **Тести.**
   - **Через зареєстрований HTTP-handler**, за зразком `src/vendor/start/login-validation-throttle.spec.ts`: фейковий `uWebSockets.js` `App`, справжні `collectRequestMetadata` і `onData`, handler з `server.patch` / `server.post`. Тести в `http-validation.spec.ts` самі передають `hasBody: true` і мокають `getData`, тож пройшли б і без виправлення.
     - `patch` з валідним JSON → handler отримує провалідований payload;
     - `patch` з невалідним JSON → HTTP 422, handler не викликано;
     - `post` з `validator` без `Content-Type` і без тіла: обов'язкові поля → 422, handler не викликано; схема без обов'язкових полів → handler отримує `{}`; поле з default → handler отримує default;
     - `post` з `validator` без `Content-Type`, `content-length > 0` → 415, `details.receivedContentType === null`;
     - `post` з `validator` без `Content-Type`, `transfer-encoding: chunked` і нуль байтів → 415 (зафіксована політика);
     - `post` без `validator` і без `Content-Type` → handler отримує `payload = null`, як раніше.
   - **`routesHandler`:**
     - `get` з `validator` → помилка; `delete` з `validator` → помилка; `del` з `validator` → помилка;
     - regression: WS-маршрут (`method: "ws"`) з `validator` проходить без помилки.
   - **Типи:** `// @ts-expect-error` на `defineRoute({ method: "delete", validator })` і `defineRoute({ method: "get", validator })`.
5. **Документація** (в тому ж PR, за `AGENTS.md`):
   - `documentation/backend/request-lifecycle.md`: крок 3 («`hasBody` лише для `post` і `put`»), розділ про тіло (порядок перевірок, новий випадок без `Content-Type` як контракт API, політика framing), абзац «поза рамками» про `PATCH`/`DELETE`, межа щодо `octet`;
   - `documentation/backend/routing-middlewares.md`: таблиця методів (які мають тіло, де дозволено `validator`, чому без тіла для `DELETE`);
   - `documentation/backend/adding-a-feature.md` і `validation.md`: для часткових оновлень — `patch`, дані для `delete` — через `:param`/`query`;
   - позначити п. 12 виправленим у `code-issues-found-during-docs.md`.
6. **Перевірка:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm docs:build && pnpm docs:verify`.
   Ручна перевірка на запущеному backend (`curl`). Для запитів з тілом автоматичний заголовок `curl` (`application/x-www-form-urlencoded` для `-d`) прибирається через `-H 'Content-Type:'`, інакше перевіряється інший сценарій:
   - `curl -X POST /api/auth/login` (без тіла й заголовка) → 422, а не 500;
   - `curl -X POST -H 'Content-Type:' -d '{"email":"a@b.c"}' /api/auth/login` → 415, `receivedContentType: null`;
   - `curl -X POST -H 'Content-Type:' -H 'Transfer-Encoding: chunked' --data-binary '' /api/auth/login` → 415;
   - тимчасовий `patch`-маршрут з `validator` (не комітиться): валідне тіло → 200, невалідне → 422;
   - тимчасовий `delete` з `validator` → сервер не стартує з зрозумілою помилкою.

## Поза обсягом

- Читання тіла для `DELETE` (див. рішення вище).
- Контракт `validator` для `octet`-маршрутів (див. «Межі гарантії»).
- Переведення наявних `put`-маршрутів часткового оновлення на `patch`: це зміна публічного API для фронтенду.
- `getTypedPayload` кидає звичайний `Error`. Заміна на доменну помилку — окремий cleanup.
- П. 13 (`sendResponse` при `payload === null`) і п. 14 (прогалини body limits) — окремими кроками feat-008.

## Прийняті рішення

- `DELETE` не читає тіло; `validator` на `get`/`delete`/`del` заборонено. Дані передаються через path або query.
- Запит без `Content-Type` і без framing тіла валідується як `{}`, тобто як наявний парсер порожнього JSON. З framing тіла — ранній 415. Обидва варіанти описуються як контракт API шаблону.
