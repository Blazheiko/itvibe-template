# План виправлення: CSP ніде не застосовується

> **Статус:** виконано у feat-005, п. 1 (PR #22, merge `70bb473`, 2026-10-20). Чекбокси DoD нижче не відмічено заднім числом: evidence — у `feature_list.json` (feat-005) і `progress.md` гілки `feat/security-hardening`. Шляхи й посилання — на момент написання.

Джерело: пункт 1 у [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md), finding M-5 у `packages/backend/src/vendor/start/SECURITY_ANALYSIS.md`.
Серйозність: висока. Область: безпека. Входить до **feat-005 Security Hardening** (`feature_list.json`), окремої feature не створюємо.

Шляхи відносно `packages/backend/`, якщо не вказано інше.

## 1. Поточний стан

- `src/config/csp.ts` описує директиви, але його ніхто не імпортує.
- У `src/vendor/start/static-server.ts` закоментовано `buildCspValue`, `setCspHeader` та їхні виклики.
- `setSecurityHeaders` (`src/vendor/utils/network/http-response-handlers.ts`) додає `nosniff`, `X-Frame-Options`, `Referrer-Policy`, HSTS, але не CSP.
- Шляхи відповідей, які обходять `setSecurityHeaders`:
  - `staticIndexHandler` (`static-server.ts`);
  - статичні 400 (небезпечний URL) і 404 у `staticHandler` (`static-server.ts` ~275);
  - CORS `OPTIONS` у `server.ts` (~569).
- Вади самого конфігу:
  - `default-src` містить `blob:` і `https://fonts.googleapis.com`;
  - `connect-src` дозволяє `https:` / `wss:` на будь-який хост;
  - `script-src 'unsafe-inline'` не потрібен: єдиний inline у `frontend/index.html` — `application/ld+json`, на який `script-src` не діє;
  - хост `https://hel1.your-objectstorage.com` захардкоджено.
- Тестовий збирач заголовків у `static-server.spec.ts` (~40) пише в словник і **перезаписує дублікати** — перевірити «рівно один CSP» ним неможливо.
- Playwright (`frontend/playwright.config.ts` ~93) піднімає Vite dev/preview, тобто бекенд і його заголовки не перевіряються. `frontend build` не копіює `dist` у `backend/public` — це робить лише `Dockerfile` (~54).

## 2. Ключові рішення

### 2.1. Єдиний режим CSP для всіх відповідей

Режим обчислюється **один раз на старті** в одному модулі й застосовується до HTML, SVG та API однаково:

| `CSP_ENABLED` | `CSP_REPORT_ONLY` | Що пишемо                                                                                        |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `false`       | будь-яке          | Жодного CSP-заголовка ні на HTML, ні на SVG, ні на API                                           |
| `true`        | `false`           | `Content-Security-Policy: <політика типу відповіді>`                                             |
| `true`        | `true`            | `Content-Security-Policy-Report-Only: <політика типу відповіді>` — **жодної** enforcing-політики |

Обґрунтування: кілька CSP-політик діють незалежно ([CSP3 §8.1 multiple policies](https://www.w3.org/TR/CSP3/#multiple-policies)). Якщо HTML отримає Report-Only, а поряд — безумовну enforcing `default-src 'none'`, застосунок блокуватиметься попри режим спостереження. Тому **жодного безумовного CSP у `DEFAULT_SECURITY_HEADERS`**.

Політика, задана контролером (`content-security-policy` або `content-security-policy-report-only` у `responseData.headers`):

- має пріоритет: глобальна політика для цієї відповіді не пишеться (будь-яке з двох імен блокує обидва глобальні);
- при `CSP_ENABLED=false` контролерний заголовок усе одно віддається — це явний вибір роуту, а прапорець керує лише глобальними політиками. Фіксуємо в документації.

### 2.2. Політика за типом відповіді

| Відповідь                                               | Політика                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| HTML: `/`, `/index.html`, SPA fallback, 200 і 304       | `document` — повна з `config/csp.ts`                                           |
| SVG зі статики, 200 і 304                               | `svg`: `default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'` |
| **`/service-worker.js`**                                | **Без CSP-заголовка** (див. 2.3)                                               |
| Інші JS, CSS, шрифти, растрові картинки                 | Без CSP (браузер ігнорує її для підресурсів)                                   |
| API JSON, помилки API, статичні 400/404, CORS `OPTIONS` | `strict`: `default-src 'none'; frame-ancestors 'none'`                         |

### 2.3. Service worker

CSP у відповіді зі скриптом service worker застосовується до самого worker ([Service Workers §CSP](https://w3c.github.io/ServiceWorker/#content-security-policy)). `/service-worker.js` реєструється у `frontend/src/main.ts` (~186) і робить `fetch` (`frontend/src/service-worker.ts` ~215). `strict` зламала б кешування та offline.

Рішення: `/service-worker.js` не отримує CSP-заголовка (worker і так обмежений same-origin скоупом і `connect`-ом сторінки не керується). Власну перевірену CSP для worker — поза скоупом, записати як follow-up. Обробник статики має явний виняток за шляхом, а не «всі `.js`», і тест на нього.

### 2.4. Дозволені origins (з реальних браузерних запитів)

| Директива          | Джерела                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `connect-src`      | `'self'`; HTTP API origin; WS origin; Sentry ingest origin (якщо задано); у dev — Vite HMR (`ws:`/`http:` localhost)                  |
| `img-src`          | `'self' data: blob:`; public origin медіа (CDN або публічний S3)                                                                      |
| `font-src`         | `'self' data: https://fonts.gstatic.com`                                                                                              |
| `style-src(-elem)` | `'self' 'unsafe-inline' https://fonts.googleapis.com`                                                                                 |
| `script-src`       | `'self'`                                                                                                                              |
| `default-src`      | `'self'`                                                                                                                              |
| інші               | `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`; `upgrade-insecure-requests` лише в production |

Звідки беремо origins (бекенд не бачить `VITE_*` під час рантайму, тому — окремі серверні змінні):

- **HTTP API origin** — `CSP_API_ORIGIN`; за замовчуванням origin `APP_URL`. Має збігатися з `VITE_BASE_URL` фронтенду (`frontend/src/utils/base-api.ts` ~59); якщо однаковий з HTML — покривається `'self'`.
- **WS origin** — береться з **фактичного** результату `getWsUrl()` (`src/app/services/communication/get-ws-url-service.ts`), який будує адресу з `DOMAIN`, `APP_ENV` і `API_PATH_PREFIX`: `new URL(getWsUrl()).origin`. Так CSP і адреса, яку клієнт отримує від API, не можуть розійтися. Override — `CSP_WS_ORIGIN` (для проксі/окремого WS-домену). З API origin WS **не** виводимо.
- **Sentry** — `CSP_SENTRY_ORIGIN` (origin з `VITE_SENTRY_DSN`, `frontend/src/utils/sentry-config.ts` ~56); порожньо → не додаємо.
- **Медіа** — origin `CDN_URL`, інакше публічний S3. Для S3 враховуємо `s3.ts` (~11): endpoint без схеми → `https://`; virtual-hosted (`bucket.endpoint`) і path-style (`endpoint/bucket`) — у CSP завжди **лише origin** (схема+хост+порт), шлях не додаємо. Точний варіант визначаємо за тим, які URL фронтенд реально отримує для аватарів.
- **Backend-only S3** (завантаження через сервер, presigned GET, що обробляє бекенд) у `connect-src` не додаємо. Якщо фронтенд робить `PUT` на presigned URL напряму — додаємо S3 origin у `connect-src` і фіксуємо це окремо.
- Додатково `CSP_EXTRA_CONNECT_SRC` / `CSP_EXTRA_IMG_SRC` (список через кому) для розширень без правки коду.

Валідація значень з env (невалідне → помилка старту в `validate-runtime-config`), окремо за призначенням:

| Змінна                                                            | Правило                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `CSP_API_ORIGIN`, `CSP_SENTRY_ORIGIN`, медіа, `CSP_EXTRA_IMG_SRC` | схема `http:`/`https:`, `new URL(x).origin === x` (лише origin, без шляху)       |
| `CSP_WS_ORIGIN` (і результат `getWsUrl()`)                        | схема `ws:`/`wss:`, лише origin                                                  |
| `CSP_EXTRA_CONNECT_SRC`                                           | кожен елемент — origin зі схемою `http(s):` або `ws(s):`                         |
| `CSP_REPORT_URI`                                                  | повний абсолютний `http(s)` URL **зі шляхом** (правило origin не застосовується) |

Для всіх: без `;`, `,`, пробілів і переносів рядка.

## 3. Кроки

### Крок 0. Оформлення

- PR у `main`: feat-005 → `owner`, `branch: feat/security-hardening`, `status: in_progress`. CSP — перша підзадача feat-005 (items 1, 2, 3, 9).
- На гілці: `progress.md` із посиланням на цей план. `./init.sh` має пройти.

### Крок 1. `src/config/csp.ts`

- Перебудувати директиви згідно з 2.4.
- `enabled` / `reportOnly` / `reportUri` з env: `CSP_ENABLED` (default `true`), `CSP_REPORT_ONLY` (default `false`), `CSP_REPORT_URI` (optional).
- Нові змінні + коментарі в `.env.example`; валідація в `validate-runtime-config`.

### Крок 2. Модуль `src/vendor/utils/network/csp.ts`

```ts
export type CspKind = 'document' | 'svg' | 'strict'
export const buildCspValue = (directives: CspDirectives): string
export const resolveCspHeaders = (config: CspConfig): Readonly<Record<CspKind, Header | null>>
export const hasCspHeader = (headers: Header[]): boolean
```

- `resolveCspHeaders` викликається один раз на старті; при `enabled=false` повертає `null` для всіх типів, при `reportOnly` — ім'я `-Report-Only` для всіх.
- Логіку побудови перенести із закоментованого коду, без `any`; закоментований код видалити.

### Крок 3. Запис заголовків

- `setSecurityHeaders(res, headers, cspKind = 'strict')`: пише CSP типу `cspKind`, якщо режим увімкнений і в `headers` немає контролерної CSP.
- Статичні обробники викликають його з `'document'` / `'svg'`; для `/service-worker.js` і решти assets — з `null` (без CSP).
- Підключити `setSecurityHeaders` до шляхів, які зараз його обходять: `staticIndexHandler`, статичні 400/404, CORS `OPTIONS`.
- Для HTML/SVG — і на 200, і на 304.

### Крок 4. Тести (Vitest)

**Тестовий збирач заголовків**: замінити словник на масив усіх викликів `writeHeader` (`{ name, value }[]`); helper `countHeader(name)` рахує без урахування регістру. Тест «рівно один CSP» = `countHeader('content-security-policy') + countHeader('content-security-policy-report-only') === 1`.

`csp.spec.ts` (одиничні):

- побудова рядка, пропуск порожніх директив, `true`-директиви;
- відхилення невалідних origins / ін'єкції `;`;
- WS origin з `getWsUrl()` і override `CSP_WS_ORIGIN`; нормалізація S3 endpoint без схеми;
- валідація за таблицею з 2.4: `ws:` у `CSP_API_ORIGIN` відхиляється, `CSP_REPORT_URI` зі шляхом приймається.

Матриця для `static-server.spec.ts` і `server.spec.ts` — режими **disabled / enforcing / report-only / контролерна політика** × відповіді:

| Відповідь                     | Очікування (enforcing)           |
| ----------------------------- | -------------------------------- |
| `/`, `/index.html` 200        | `document`, рівно один           |
| HTML 304 (`If-None-Match`)    | `document`, рівно один           |
| SPA fallback (невідомий шлях) | `document`                       |
| SVG 200 і 304                 | `svg`                            |
| `/service-worker.js`          | жодного CSP                      |
| відсутній asset (404)         | `strict`                         |
| небезпечний URL (400)         | `strict`                         |
| API JSON, API помилка         | `strict`                         |
| CORS `OPTIONS`                | `strict`                         |
| роут із власною CSP           | лише контролерна, без глобальної |

У `disabled` — нуль CSP скрізь, крім контролерної. У `report-only` — **глобальна** політика лише як `-Report-Only`, жодної глобальної enforcing. Контролерна CSP віддається як є (може бути enforcing — це явне рішення роуту, див. 2.1).

### Крок 5. Відтворюваний production-запуск і браузерні тести

- Скрипт `pnpm prod:local` (root): `shared build` → `frontend build` → `backend build` → копія `frontend/dist` у `backend/public` (як у `Dockerfile`) → старт бекенду з `SERVE_STATIC=true`, `APP_ENV=production`, тестовими `CSP_*`.
- **Залежності від feat-006 немає.** Item 4 падає лише тоді, коли каталогу `backend/public` немає (`ENOENT ... scandir`). `prod:local` створює його до старту, тож цього достатньо. Код обробки відсутнього каталогу і `.env.example` у межах CSP **не змінюємо** — це залишається в feat-006.
- Окремий Playwright-проєкт `csp` (`frontend/e2e/csp.spec.ts`), `webServer` → `pnpm prod:local`, `baseURL` бекенду. Наявні dev/preview-тести не чіпаємо.
- Позитивні сценарії (жодного `securitypolicyviolation`): логін, WS-з'єднання й чат, показ аватара з CDN/S3, Google Fonts, реєстрація service worker і робота offline (перезавантаження з `context.setOffline(true)`).
- Контрольований тестовий origin: Playwright піднімає локальний HTTP-сервер на іншому порту (напр. `http://127.0.0.1:4599/probe`), який відповідає `200` з `Access-Control-Allow-Origin: *`. Цього origin **немає** в політиці. Так результат `fetch` залежить лише від CSP, а не від CORS, DNS чи TLS.
- Негативні сценарії, enforcing-прогін:
  - `page.evaluate` вставляє inline `<script>`, що виставляє `window.__inlineRan = true` → прапорець не виставлено; подія `securitypolicyviolation` з `effectiveDirective === 'script-src-elem'` (для inline-елемента ефективна директива завжди `script-src-elem`, навіть коли обмеження приходить через fallback `script-src` — [CSP3 §effective directive for inline check](https://w3c.github.io/webappsec-csp/#effective-directive-for-inline-check)) і `disposition === 'enforce'`;
  - `fetch` на тестовий origin → reject (`TypeError`), violation з `effectiveDirective === 'connect-src'` і `disposition === 'enforce'`;
  - відповідь HTML містить заголовок `content-security-policy` і **не** містить `-report-only` (`response.headers()`).
- Report-only-прогін (ті ж сценарії):
  - inline-скрипт виконався (`__inlineRan === true`), violation з `disposition === 'report'`;
  - `fetch` на тестовий origin повертає `200` і тіло probe, violation з `disposition === 'report'`;
  - HTML містить лише `content-security-policy-report-only`.

### Крок 6. Ручна перевірка (golden path)

1. `pnpm prod:local`.
2. Заголовки — лише GET (статика зареєстрована через GET, `curl -I` шле HEAD):
   `curl -sS -D - -o /dev/null http://localhost:3000/`, а також `/index.html`, `/favicon.svg`, `/service-worker.js`, `/api/<роут>`, `/missing.js`, і `curl -sS -X OPTIONS -D - -o /dev/null -H 'Origin: ...' http://localhost:3000/api/<роут>`.
3. Браузер: логін, чат, аватар, offline через DevTools → Application → Service Workers. Console без CSP violations.
4. Вивід curl і результат Playwright `csp` — у `progress.md` → Evidence of Completion.

### Крок 7. Перехід у production

- Report-Only без `CSP_REPORT_URI` дозволений: порушення видно локально в DevTools. Для **централізованого** збору репортів потрібен отримувач (`CSP_REPORT_URI` на зовнішній сервіс) — сервер сам їх не логує. Фіксуємо в документації.
- `upgrade-insecure-requests` у Report-Only ігнорується ([upgrade-insecure-requests §delivery](https://www.w3.org/TR/upgrade-insecure-requests/#delivery)) — перевіряється лише в enforcing-прогоні кроку 5.
- Рекомендація: перший деплой з `CSP_REPORT_ONLY=true` і налаштованим `CSP_REPORT_URI`, після аналізу — `false`.

### Крок 8. Документація

- `documentation/backend/auth-security.md`, розділ «Заголовки безпеки та CSP»: прибрати `::: danger`, описати таблиці 2.1–2.2, виняток для service worker, пріоритет контролерної політики, як додати свій домен.
- `documentation/backend/configuration.md`: усі `CSP_*`.
- `documentation/backend/deployment.md`: при `SERVE_STATIC=false` CSP для HTML ставить reverse proxy, приклад для nginx (з тим самим винятком для `/service-worker.js`).
- `documentation/backend/testing.md`: проєкт Playwright `csp` і `pnpm prod:local`.
- `pnpm docs:build && pnpm docs:verify`.
- `code-issues-found-during-docs.md`: пункт 1 позначити виправленим із посиланням на PR; оновити M-5 у `SECURITY_ANALYSIS.md`.

## 4. Definition of Done

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` чисті
- [ ] Матриця режимів × відповідей з кроку 4 зелена, перевірка дублікатів через масив викликів
- [ ] Playwright `csp` на production-збірці через бекенд: позитивні, негативні та offline-сценарії зелені; окремий report-only прогін
- [ ] `pnpm --filter frontend test:e2e` (наявні) зелений
- [ ] Вивід `curl -sS -D -` для всіх шляхів з кроку 6 у Evidence
- [ ] Документація оновлена, `pnpm docs:build && pnpm docs:verify` пройшли
- [ ] feat-005 у `feature_list.json` оновлено з посиланням на evidence (`done` — після решти items 2, 3, 9)

## 5. Ризики

| Ризик                                                 | Пом'якшення                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Report-Only + enforcing одночасно блокують застосунок | Єдиний режим (2.1), тест «у report-only немає глобальної enforcing»    |
| WS-адреса в CSP розходиться з адресою, яку видає API  | Origin з `getWsUrl()` + override `CSP_WS_ORIGIN`, WS-сценарій у e2e    |
| Service worker отримує `strict` і ламає offline       | Виняток за шляхом (2.3), тест + offline-сценарій у Playwright          |
| Пропущений origin (API на іншому домені, Sentry, CDN) | Таблиця 2.4, env-змінні, позитивні e2e на production-збірці            |
| «Немає violations», бо CSP взагалі нема               | Негативні e2e + перевірка наявності заголовка                          |
| Дубль CSP                                             | Збирач-масив і тест «рівно один»                                       |
| `SERVE_STATIC=true` ламає запуск (item 4)             | `prod:local` створює `backend/public` до старту; сам фікс — у feat-006 |
| CSP відсутня в продакшені, де HTML віддає nginx/CDN   | Документація + приклад конфігу proxy                                   |

## 6. Поза скоупом

- Nonce/hash-based CSP і `strict-dynamic`.
- Власний endpoint для прийому CSP-репортів (лише `CSP_REPORT_URI` на зовнішній сервіс).
- Окрема CSP для service worker (follow-up).
- Інші заголовки (`Permissions-Policy`, COOP/COEP).
