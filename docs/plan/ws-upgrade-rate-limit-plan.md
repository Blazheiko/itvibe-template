# План: rate limit на WebSocket upgrade і глобальний per-IP ліміт (feat-005, пункт 2)

> **Статус:** виконано у feat-005, п. 2 (PR #22, merge `70bb473`, 2026-10-20; PR #23, merge `e774d15`, 2026-10-21). Шляхи й посилання — на момент написання.

Джерело: пункт 2 у [code-issues-found-during-docs.md](./code-issues-found-during-docs.md), залишок finding C-2. Редакція 3, з урахуванням двох рев'ю.

## Поточний стан (перевірено в коді)

- Лічильник [`rate-limit-counter.ts`](../../packages/backend/src/vendor/utils/rate-limit/rate-limit-counter.ts) — це sliding log у пам'яті процесу. Його використовують per-route HTTP ([`http-rate-limit.ts`](../../packages/backend/src/vendor/utils/rate-limit/http-rate-limit.ts)) і WS-повідомлення ([`ws-rate-limit.ts`](../../packages/backend/src/vendor/utils/rate-limit/ws-rate-limit.ts)). У нього три вади:
    - **Відхилені спроби теж пишуться.** `push(now)` виконується на кожну спробу, включно з відхиленими (рядок 74). Під флудом масив одного IP росте без межі.
    - **Межа кількості ключів не працює.** `MAX_KEYS` лише запускає повний обхід `Map` (рядок 59). Якщо записи ще активні, новий ключ однаково додається. Пам'ять не обмежена, і кожен новий ключ провокує дорогий обхід.
    - **`Retry-After` вводить в оману.** `resetTime` рахується від найстарішого timestamp (рядок 80). Через відхилені записи після цього часу в журналі лишається більше за `max`, тож повтор через `Retry-After` знову отримує 429.
- HTTP-перевірка навмисно синхронна: вона стоїть до `res.onData()` (`server.ts`, крок 2). Через це Redis тут не підходить.
- `ResponseData.setHeader` дописує заголовок у масив і не замінює вже наявний ([`response-data.ts:64`](../../packages/backend/src/vendor/utils/network/response-data.ts)). Два ліміти, які обидва пишуть `X-RateLimit-*`, дадуть дублікати.
- Preflight-запити `OPTIONS` і API-404 обробляє `server.any("/*")` в обхід `setHttpHandler` (`server.ts:565`).
- WS-шлях — `/${API_PATH_PREFIX}/websocket`, за замовчуванням `/api/websocket` (`server.ts:103`).
- `handleUpgrade` ([`ws-handlers.ts`](../../packages/backend/src/vendor/utils/network/ws-handlers.ts)) перевіряє лише формат токена. Потім він іде в сесію (`onUpgrade`) і робить `res.upgrade`.
- Після закриття з'єднання фронтенд перепідключається через 5 с ([`useWebSocketConnection.ts:178`](../../packages/frontend/src/composables/useWebSocketConnection.ts)). Одна вкладка з постійними обривами дає до 12 upgrade на хвилину.
- IP береться з `getIP()`. Проксі вважається довіреним лише при `TRUST_PROXY=true` і непорожньому `TRUSTED_PROXY_CIDRS`.

## Шари (як буде)

```
HTTP API:  L1 global per-IP  →  per-route limit  →  handler
WebSocket: upgrade per-IP    →  auth (onUpgrade)  →  per-message limits
```

Бюджети незалежні: upgrade не витрачає HTTP L1, а HTTP не витрачає бюджет upgrade.

## Що робимо

### 0. Переробити лічильник (передумова, P1)

Новий модуль `rate-limit-store.ts` з фабрикою `createRateLimitStore({ maxKeys, now? })`. `maxKeys` і `now` передаються, щоб тести працювали з малою місткістю і контрольованим часом.

API: `consume(key, { windowMs, max, algorithm }): RateLimitDecision`. Тип рішення:

```ts
type RateLimitDecision =
    | { allowed: true; remaining: number; resetAt: number }
    | { allowed: false; retryAfterMs: number; resetAt: number }
```

**Семантика відхилених спроб.** Відхилена спроба квоту не споживає і в стані не записується. Тому `retryAfterMs` — це точний час, коли звільниться одне місце: повтор через `Retry-After` проходить.

**Алгоритми:**

| Алгоритм       | Де використовується                      | Стан на ключ                                                                       | Retry-After                      |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| `sliding-log`  | per-route HTTP, WS-повідомлення, upgrade | масив timestamps довжиною не більше `max`, бо зберігаються тільки дозволені спроби | `timestamps[0] + windowMs - now` |
| `fixed-window` | глобальний L1 (`max` = 600)              | `{ windowStart, count }`, O(1)                                                     | `windowStart + windowMs - now`   |

Для L1 sliding log з 600 timestamps на кожен IP коштував би до 60M чисел при 100k ключів. Fixed window дає O(1) пам'яті. Ціна — можливий сплеск до 2×`max` на межі вікна. Для грубого L1 це прийнятно, суворі ліміти лишаються на маршрутах.

**Справжня межа ключів:**

- Нові ключі в `Map` додаються в порядку вставки. Якщо `size === maxKeys`, спершу видаляються прострочені ключі, але обмежено: не більше K ключів (наприклад, 64) з голови `Map`.
- Якщо місця досі немає, видаляється найстаріший ключ з голови. Це O(1).
- Повного обходу на гарячому шляху більше немає. Повний GC лишається тільки в таймері раз на 60 с.
- Наслідок витіснення: при переповненні store строгість квот не гарантується. FIFO може скинути навіть активно використовуваний ключ, включно з маршрутним лімітом логіну. Це прямо пишемо в документації. Під атакою з великої кількості IP старі лічильники обнуляються. Атакувальник з такою кількістю IP і так обходить per-IP ліміт, а пам'ять при цьому лишається обмеженою. Витіснення пишемо в лог `warn` з rate-limit (не частіше разу на хвилину).

Один store на процес, ключі мають префікси `http:`, `route:`, `ws-msg:` і `upgrade:`.

Обидва існуючі лімітери (`http-rate-limit.ts`, `ws-rate-limit.ts`) переводимо на `consume`. Їхні зовнішні контракти (`429`/`503`, WS-envelope) не змінюються. `retryAfter` тепер рахується з `retryAfterMs`.

### A. Ліміт на upgrade за IP

1. Функція `checkUpgradeRateLimit(ip)` повертає один з трьох варіантів:
    - `{ kind: "allowed" }`;
    - `{ kind: "limited"; retryAfter }`;
    - `{ kind: "unavailable" }`, коли лічильник кинув помилку.
2. У `handleUpgrade` перевірка стоїть одразу після `getIP()`: до перевірки формату токена і до `onUpgrade`. Відповіді:
    - `limited` → `429 Too Many Requests` з `Retry-After`, без `upgrade`;
    - `unavailable` → `503 Service Unavailable` (fail closed, як у HTTP).
3. Конфіг: `WS_UPGRADE_RATE_LIMIT_WINDOW_MS` (`60000`) і `WS_UPGRADE_RATE_LIMIT_MAX` (`60`). Чому 60, а не 30: reconnect кожні 5 с дає 12 спроб на хвилину з вкладки, тож 60 витримує кілька вкладок за одним NAT. Значення перевіряється reconnect-тестом.

### B. Глобальний per-IP ліміт для HTTP (L1)

1. Функція `checkGlobalRateLimit(ip, responseData)` синхронна, ключ `http:<ip>`. Ключ один на IP для всіх API-шляхів, включно з невідомими.
2. **Охоплення.** L1 виконується рівно один раз на запит:
    - Зареєстровані API-маршрути: у `setHttpHandler` на кроці 2, перед per-route лімітом.
    - `server.any("/*")`: API-404 (`/${appConfig.pathPrefix}/...`) і preflight `OPTIONS` на API-шляхи. Preflight рахуємо: це реальне навантаження, і інакше ним можна флудити безкоштовно. Бюджет 600 на хвилину закладає множник ×2 на preflight.
    - Префікс береться з `appConfig.pathPrefix`, тому змінений `API_PATH_PREFIX` працює.
    - Не лімітується статика (`SERVE_STATIC`).
    - З L1 виключені лише запити, які реально обробляє `handleUpgrade`: вони мають власний бюджет. Звичайні GET/POST/OPTIONS на `/${pathPrefix}/websocket`, що потрапили в HTTP fallback, витрачають HTTP-бюджет L1, як будь-який API-шлях.
3. **Заголовки:**
    - На успішній відповіді L1 нічого не пише. `X-RateLimit-*` пише лише per-route ліміт, якщо він є, тож дублікатів немає.
    - На 429 від L1 відповідь містить `X-RateLimit-Limit`, `X-RateLimit-Remaining: 0`, `X-RateLimit-Reset` і `Retry-After` саме для L1. Per-route перевірка тоді не виконується.
    - На 429 від per-route ліміту заголовки описують маршрут.
    - Тести рахують усі записи заголовків без урахування регістру.
4. Конфіг: `HTTP_GLOBAL_RATE_LIMIT_WINDOW_MS` (`60000`) і `HTTP_GLOBAL_RATE_LIMIT_MAX` (`600`).

### C. Валідація конфігу

- `*_MAX` — ціле число ≥ 0, де `0` вимикає ліміт.
- `*_WINDOW_MS` — ціле число > 0.
- Дроби, `Infinity`, `NaN`, порожні й нечислові рядки відхиляються: старт падає з помилкою в `validate-runtime-config.ts`, як у CSP (`configError`).

### D. Попередження про проксі

Попередження (`logger.warn`) на старті, якщо `appConfig.isProductionLike`, у двох випадках:

- `TRUST_PROXY=false`;
- `TRUST_PROXY=true`, але `TRUSTED_PROXY_CIDRS` порожній. Проксі тоді теж не довірений.

Текст попередження: за проксі всі клієнти ділитимуть один IP і один ліміт. Старт це не зупиняє.

### E. Redis — не робимо, документуємо

- HTTP-перевірка синхронна, тому лічильник лишається в пам'яті процесу. При N інстансах ефективний ліміт множиться на N.
- У `deployment.md` додаємо приклад nginx:
    - `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;`;
    - `limit_req zone=api burst=...` на `location /api/`;
    - для `location /api/websocket` окрема зона (`limit_req` на upgrade) і `limit_conn`;
    - `limit_req_status 429; limit_conn_status 429;`, бо за замовчуванням nginx повертає 503.
- Застереження в документації: зона спільна лише в межах одного nginx. Кілька незалежних edge-вузлів мають окремі квоти. Посилання: <https://nginx.org/en/docs/http/ngx_http_limit_req_module.html>.
- Redis-лічильник записуємо як відкриту підзадачу в `code-issues-found-during-docs.md`.

## Тести

**Unit, `rate-limit-store.spec.ts`** (місткість `maxKeys: 4`, фейковий `now`):

- `max` спроб проходять, `max+1` відхиляється.
- Відхилені спроби не ростять стан: після 1000 відмов довжина журналу дорівнює `max`.
- **Відновлення після серії відмов:** після `max` дозволених і 50 відхилених повтор рівно через `retryAfterMs` проходить. Повтор на 1 мс раніше відхиляється.
- Fixed window: скидання на межі вікна, точний `retryAfterMs`.
- Межа ключів:
    - `size` ніколи не перевищує `maxKeys`;
    - прострочені ключі видаляються першими;
    - інакше витісняється найстаріший;
    - на один `consume` виконується не більше K перевірок (рахуємо лічильником у тесті).
- `MAX=0` вимикає ліміт.

**Unit, лімітери:**

- `http-rate-limit` і `ws-rate-limit` зберігають контракти 429/503.
- L1 спрацьовує раніше per-route.
- Заголовки: на успіху один комплект `X-RateLimit-*`, на 429 від L1 комплект L1. Рахуємо без урахування регістру.
- `upgrade`:
    - `limited` → 429 з `Retry-After`, `onUpgrade` і `res.upgrade` не викликаються;
    - `unavailable` → 503;
    - невалідний токен під лімітом → 401, але спроба врахована;
    - інший IP проходить;
    - після вікна upgrade знову проходить.

**`server` (fake uWS App, як у `server-csp.spec.ts`):**

- L1 рахує API-маршрут, API-404 і preflight `OPTIONS` в одному bucket.
- L1 виконується один раз на запит.
- Статика не рахується.
- Змінений `pathPrefix` працює.
- Upgrade-бюджет незалежний від HTTP.
- Звичайний HTTP GET/POST на `/${pathPrefix}/websocket` рахується в L1, а справжній upgrade на ту саму адресу — лише в upgrade-limiter.

**Транспортний smoke на реальному uWS** (`rate-limit.transport.spec.ts`): справжній `App().listen(0)` з тестовими маршрутами.

- Дозволений короткий POST з тілом доходить до handler, і тіло не загублене. Це регресія синхронності.
- Заблокований POST отримує 429, handler не викликається.
- WS-handshake перевіряємо через `node:http.request` з повними upgrade-заголовками (`Connection: Upgrade`, `Upgrade: websocket`, `Sec-WebSocket-Key`, `Sec-WebSocket-Version: 13`, `Sec-WebSocket-Protocol: <token>`). Вбудований `WebSocket` не показує статус відмови і заголовки, тільки помилку ([WebSocket API](https://websockets.spec.whatwg.org/#feedback-from-the-protocol)). Тому:
    - успішний handshake ловимо подією `upgrade` (`101`);
    - відмову ловимо подією `response`, у ній перевіряємо статус 429 і `Retry-After` або 503;
    - після вікна (короткий `windowMs` у тесті) handshake знову дає `upgrade`.
- Reconnect-сценарій: 3 «вкладки», кожна перепідключається кожні 5 с протягом хвилини (фейковий час на рівні store), і жодна не впирається в ліміт.

**Ручна перевірка на `pnpm prod:local`** (результати в evidence `progress.md`):

- curl-цикл по `/api/main/init` → 429 з `Retry-After`; повтор через указаний час проходить.
- Повний WS-handshake скриптом на `node:http.request` з upgrade-заголовками (той самий helper, що в smoke-тесті): цикл → `response` 429 з `Retry-After`, після вікна → подія `upgrade` 101.

## Документація

- `auth-security.md`, розділ rate limiting: дві гілки шарів (схема вище), семантика відхилених спроб і `Retry-After`, межа ключів і витіснення (при переповненні store строгість квот не гарантується), обмеження in-memory.
- `configuration.md` і `.env.example`: нові змінні та правила валідації.
- `deployment.md`: nginx-приклад з `/api/websocket` і `limit_req_status 429`, застереження про кілька edge-вузлів.
- `code-issues-found-during-docs.md`: пункт 2 позначаємо як виправлений, Redis — як відкрита підзадача.

## Поза обсягом

- Пункт 18: відхилення upgrade без живої сесії до `res.upgrade`. Робиться окремо.
- Ліміт одночасних WS-з'єднань на IP. Це окремий механізм (лічильник у `open`/`close`).
