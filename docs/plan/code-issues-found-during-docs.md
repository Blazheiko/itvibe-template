# Проблеми в коді, знайдені під час написання документації (feat-003)

Знайдено під час написання сторінок v1 (feat-003). Перевірено читанням коду та прогоном на чистому клоні.
Нічого з переліченого **не виправлено**: це поза обсягом feat-003 (документація без змін коду).
Кожен пункт — кандидат на окремий запис у `feature_list.json` або issue.

Шляхи відносно `packages/backend/`, якщо не вказано інше.

## Зведення

| #   | Проблема                                                                                                          | Серйозність  | Область                      |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------- |
| 1   | ~~CSP ніде не застосовується~~ ✅                                                                                 | Висока       | Безпека                      |
| 2   | ~~Немає rate limit на WebSocket upgrade і глобального per-IP ліміту~~ ✅                                          | Висока       | Безпека                      |
| 3   | ~~WS-токен і `userToken` потрапляють у логи~~ ✅                                                                  | Середня      | Безпека                      |
| 4   | ~~`SERVE_STATIC=true` у `.env.example` ламає запуск~~ ✅                                                          | Середня      | DX / конфігурація            |
| 5   | ~~Fallback `PGSQL_PORT` не працює → `NaN`~~ ✅                                                                    | Середня      | Конфігурація                 |
| 6   | ~~Розбіжності `.env.example` з кодом~~ ✅                                                                         | Середня      | Конфігурація                 |
| 7   | ~~Потрібен pgvector, ніде не задокументовано~~ ✅                                                                 | Низька       | DX / БД                      |
| 8   | ~~Різні PostgreSQL defaults у застосунку та скриптах~~ ✅                                                         | Низька       | Конфігурація                 |
| 9   | ~~`broadcastToChannel` без runtime-перевірки каналу (L-4)~~ ✅                                                    | Низька       | Безпека                      |
| 10  | ~~`db:seed` — порожня заглушка~~ ✅                                                                               | Низька       | DX / БД                      |
| 11  | ~~`src/drizzle/schema/index.ts` порожній~~ ✅                                                                     | Низька       | Структура                    |
| 12  | ~~Тіло запиту читається лише для `post`/`put`~~ ✅                                                                | Низька       | HTTP                         |
| 13  | `sendResponse` при `payload === null` віддає `String(status)` як JSON                                             | Низька       | HTTP                         |
| 14  | Прогалини плану body limits: тести, `.env.example`, playground                                                    | Низька       | HTTP / тести                 |
| 15  | Застарілі внутрішні документи                                                                                     | Низька       | Документація                 |
| 16  | Стиль коду бекенду не відповідає `AGENTS.md`                                                                      | Інформаційна | Стиль                        |
| 17  | Фронтенд вшиває префікс `api/` у WS-події                                                                         | Середня      | WebSocket / frontend         |
| 18  | WS upgrade без валідної сесії не відхиляється                                                                     | Низька       | WebSocket / безпека          |
| 19  | Мертвий код у WebSocket-шарі                                                                                      | Низька       | WebSocket / структура        |
| 20  | Сервіси push-нотифікацій звертаються до БД напряму                                                                | Середня      | Шари / БД                    |
| 21  | N+1 у `findByUserIdWithLogs` і статистика в JS                                                                    | Середня      | Продуктивність               |
| 22  | Контролери та middleware оминають сервіси                                                                         | Низька       | Шари                         |
| 23  | `prompt-controller` сам викликає OpenAI і кидає `Error`                                                           | Середня      | Шари / помилки               |
| 24  | Repositories barrel неповний, змішані стилі імпорту                                                               | Низька       | Структура                    |
| 25  | `clearEmbedding` — два запити без транзакції, сирий SQL з назвами                                                 | Низька       | БД                           |
| 26  | ArkType-адаптер віддає лише `summary`, без помилок по полях                                                       | Низька       | Валідація                    |
| 27  | Мертвий і застарілий код валідації та контролерів                                                                 | Низька       | Структура                    |
| 28  | Немає `.dockerignore`                                                                                             | Середня      | Docker / безпека             |
| 29  | Контейнер працює від root, без `HEALTHCHECK`                                                                      | Середня      | Docker / безпека             |
| 30  | `CMD` через `sh -c`: міграції на кожному старті, сигнали                                                          | Середня      | Docker / експлуатація        |
| 31  | ~~Образ не вмикає `SERVE_STATIC` і не задає `APP_ENV`~~ ✅                                                        | Низька       | Docker / конфігурація        |
| 32  | `corsS3.xml`: `AllowedOrigin *` разом з `PUT`                                                                     | Середня      | Безпека / S3                 |
| 33  | `handleError` логує без `requestId`, контекст без `userId`                                                        | Низька       | Observability                |
| 34  | Рівень логування не налаштовується (`LOG_LEVEL` немає)                                                            | Низька       | Observability                |
| 35  | Немає readiness-перевірки (DB/Redis)                                                                              | Середня      | Observability / експлуатація |
| 36  | Немає CI для тестів застосунку і coverage                                                                         | Середня      | Тести / CI                   |
| 37  | `vitest.config.ts` без `testTimeout`, таймаути під навантаженням                                                  | Низька       | Тести                        |
| 38  | Playwright `webServer` використовує `npm` у pnpm-workspace                                                        | Низька       | Тести / frontend             |
| 39  | Річний `immutable` для всіх не-HTML файлів, зокрема без хешу                                                      | Середня      | Кешування                    |
| 40  | `If-None-Match` порівнюється як точний рядок                                                                      | Низька       | Кешування                    |
| 41  | Статика повністю в RAM без стиснення і ліміту                                                                     | Низька       | Продуктивність               |
| 42  | API JSON без `Cache-Control: no-store`                                                                            | Середня      | Кешування / безпека          |
| 43  | Кеш промптів у пам'яті процесу без TTL                                                                            | Низька       | Кешування / AI               |
| 44  | `deleteFromS3` без `buildKey`, логіка префікса в трьох місцях                                                     | Низька       | Сховище                      |
| 45  | Аватари без `public-read`, але читаються напряму через CDN                                                        | Низька       | Сховище                      |
| 46  | MIME-тип довіряється заголовку клієнта                                                                            | Середня      | Сховище / безпека            |
| 47  | Підписка push перепризначається іншому користувачу за endpoint                                                    | Низька       | Push / безпека               |
| 48  | `GET /test-push` з побічними ефектами (оминає CSRF)                                                               | Низька       | Push / безпека               |
| 49  | Push надсилається лише з `test-push`, послідовно без батчів                                                       | Низька       | Push                         |
| 50  | Невідомий `AI_TEXT_DRIVER` мовчки дає Mistral                                                                     | Низька       | AI / конфігурація            |
| 51  | Виклики AI-провайдерів без timeout/`AbortSignal`                                                                  | Середня      | AI / надійність              |
| 52  | Support AI: `langNative = 'ru'` зашито в коді                                                                     | Середня      | AI / i18n                    |
| 53  | Неповний облік використання AI (переклад, тест промпту, embeddings, Mistral без usage)                            | Низька       | AI                           |
| 54  | Embeddings: `vector(1536)` зашито, `reindexAll` без батчів, пошук без порогу                                      | Низька       | AI / БД                      |
| 55  | `llm_text_usage.final_prompt` безстроково зберігає повні тексти (PII)                                             | Середня      | AI / приватність             |
| 56  | Тест shared не містить жодного тесту (`pass 1` — порожній файл)                                                   | Середня      | Тести / shared               |
| 57  | `guards` у shared порожні й закоментовані в `index.ts`                                                            | Низька       | shared                       |
| 58  | `EntityIdSchema` без `.brand()` — не брендований тип                                                              | Низька       | shared                       |
| 59  | Фронтенд: fallback `VITE_BASE_URL` на `https://itvibe-template.example`                                           | Середня      | Frontend / DX                |
| 60  | ~~Фронтенд: `console.log(data)` друкує відповідь init з `wsToken`~~ ✅                                            | Середня      | Frontend / безпека           |
| 61  | Фронтенд: нетипізовані `VITE_*` змінні, застарілі коментарі                                                       | Низька       | Frontend                     |
| 62  | Playground: `/api/doc/routes` зашито, ігнорує `baseUrl` і `API_PATH_PREFIX`                                       | Низька       | Playground                   |
| 63  | Playground: `https://` → `ws://` замість `wss://`                                                                 | Низька       | Playground                   |
| 64  | Playground: «message queued», хоча повідомлення відкидається                                                      | Низька       | Playground                   |
| 65  | ~~`POST /main/save-user`: анонімне створення користувача з паролем у відкритому тексті~~ ✅ виправлено (feat-012) | **Критична** | Безпека                      |
| 66  | `users.isAdmin` — мертве поле поруч із `role`                                                                     | Низька       | БД / ролі                    |
| 67  | Push-група без `auth_guard`, перевірка в контролері                                                               | Низька       | Безпека / ролі               |
| 68  | ESLint `strictTypeChecked` фактично вимкнено для backend/frontend/playground                                      | Низька       | Toolchain                    |
| 69  | `AGENTS.md`: застаріле «checkout does not include .git history»                                                   | Інформаційна | Документація                 |
| 70  | ~~Основний Redis-клієнт без таймауту: при недоступному Redis запити чекають ~45 с~~ ✅                            | Середня      | Надійність / Redis           |

## Безпека

### 1. CSP ніде не застосовується

> **Виправлено** у feat-005 (гілка `feat/security-hardening`) за планом [`csp-fix-plan.md`](./csp-fix-plan.md).

- **Що:** конфіг `src/config/csp.ts` ніхто не імпортує. Код встановлення CSP у `src/vendor/start/static-server.ts` закоментовано. `setSecurityHeaders` у `src/vendor/start/server.ts` додає `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` і HSTS, але `Content-Security-Policy` не додає.
- **Наслідок:** жодна відповідь (API, статика, HTML) не має CSP. Це finding M-5 зі `SECURITY_ANALYSIS.md`, закритий лише частково.
- **Пропозиція:** підключити `config/csp.ts` у `setSecurityHeaders` і в static handler; додати тест на наявність заголовка.

### 2. Немає rate limit на WebSocket upgrade і глобального per-IP ліміту

> **Виправлено** у feat-005 (гілка `feat/security-hardening`) за планом [`ws-upgrade-rate-limit-plan.md`](./ws-upgrade-rate-limit-plan.md): L1 per-IP для HTTP API, окремий ліміт upgrade, лічильник з обмеженою пам'яттю. Підзадачу для кількох інстансів закрито у feat-013 за планом [`redis-rate-limit-plan.md`](./redis-rate-limit-plan.md): HTTP і WS-повідомлення свідомо лишаються в пам'яті (захист процесу), WS upgrade отримав другий рівень у Redis, а чутливі auth-дії (зокрема вхід, зміна й скидання пароля) обмежує спільний реєстр `config/throttle-policies.ts`. Поки що замість нього рекомендовано edge-ліміт у nginx, його описано в `deployment.md`.

- **Що:** rate limiting є лише per-route для HTTP (`src/vendor/utils/rate-limit/*`), перевірка виконується до читання body. Upgrade-запит WebSocket ліміту не має. Глобального L1-ліміту за IP також немає. Лічильник зберігається в пам'яті процесу, а не в Redis.
- **Наслідок:** при кількох інстансах ліміт не спільний. Upgrade можна флудити. Це залишок finding C-2.
- **Пропозиція:** додати ліміт на `upgrade` за IP (`src/vendor/utils/rate-limit/ws-rate-limit.ts` або в `handleUpgrade`), розглянути Redis-лічильник для multi-instance.

### 3. WS-токен і `userToken` потрапляють у логи

> **Виправлено** у feat-005 (гілка `feat/security-hardening`): хелпер `maskTokenForLogs` (`src/vendor/utils/helpers/mask-sensitive.ts`) лишає в логах лише префікс `abcd…`. Його застосовано в `verifyUpgradeToken` (WS-токен; замість `sessionKey` логуються `sessionId` і маскований `userToken`), `wsSessionHandler` (`userToken`) `verifyToken` у `token-handler.ts` (`cookieUserToken`; підпис більше не логується) і `destroyAllSessions` у `redis-session-storage.ts` (`userToken`; Redis-pattern більше не логується). `parseCookies` при помилці декодування більше не друкує весь заголовок `Cookie`. Префікс із 4 символів годиться для локального зіставлення разом із `sessionId`, але не унікальний; для кореляції в масштабі потрібен стабільний HMAC-fingerprint (не зроблено).

- **Що:** `verifyUpgradeToken` логує WS-токен; `wsSessionHandler` логує `userToken`.
- **Наслідок:** секрети сесії потрапляють у логи та Sentry breadcrumbs.
- **Пропозиція:** прибрати значення з логів або маскувати (`abcd…`).

### 9. `broadcastToChannel` без runtime-перевірки каналу

> **Виправлено** у feat-005: whitelist `WS_CHANNELS` і guard `isWsChannel` у `packages/shared/src/guards/ws-channels.ts` (без залежностей); `broadcastToChannel` приймає `WsChannel` і в runtime відкидає невідомі канали з `warn`. Заодно `shared/guards` перестав бути порожнім (частково п. 57).

- **Що:** `broadcastToChannel(channel: string, …)` приймає будь-який рядок, перевірка є лише на рівні типів. Finding L-4 зі `SECURITY_ANALYSIS.md` досі відкритий.
- **Пропозиція:** whitelist/шаблон допустимих каналів або перевірка формату перед publish.

## Конфігурація та запуск

### 4. `SERVE_STATIC=true` у `.env.example` ламає запуск

> **Виправлено** у feat-006 (гілка `feat/env-example-sync`): у `.env.example` `SERVE_STATIC=false`; без каталогу `public` `cacheStaticSource` пише `logger.warn` і сервер стартує без статики; `Dockerfile` задає `SERVE_STATIC=true` і `APP_ENV=production` (закриває і п. 31).

- **Що:** `.env.example` містить `SERVE_STATIC=true`. Тоді бекенд на старті сканує `packages/backend/public`, якого в репозиторії немає, і падає. Default у коді — `false` (`src/config/app.ts`).
- **Відтворення:** чистий клон → `cp .env.example .env` → `pnpm dev`, результат — `ENOENT: no such file or directory, scandir '.../packages/backend/public'`.
- **Пропозиція:** у `.env.example` поставити `SERVE_STATIC=false` або обробляти відсутність каталогу (warning замість падіння).

### 5. Fallback `PGSQL_PORT` не працює

> **Виправлено** у feat-006: `resolveDatabaseConfig()` у `src/config/database.ts` дає порт `5432`, коли `PGSQL_PORT` не задано або порожній, а на невалідне значення кидає помилку на старті.

- **Що:** у `src/config/database.ts` написано `Number(env["PGSQL_PORT"]) ?? 5432`. `Number(undefined)` повертає `NaN`, а не `null`/`undefined`, тому `??` ніколи не спрацьовує.
- **Наслідок:** без `PGSQL_PORT` застосунок отримує порт `NaN`.
- **Пропозиція:** `Number(env["PGSQL_PORT"] ?? 5432)` або парсинг з перевіркою.

### 6. Розбіжності `.env.example` з кодом

> **Виправлено** у feat-006: `.env.example` синхронізовано з кодом. Прибрано `UNIX_PATH` (замінено на `APP_UNIX_PATH`), `DATABASE_URL`, `TELEGRAM_*`, `XAI_IMAGE_*`; додано `API_PATH_PREFIX`, `APP_MAX_*_BODY_SIZE`, OAuth-змінні, `AI_TEXT_DRIVER`, `MISTRAL_*`, `TURN_*`; `REDIS_PREFIX` = `uwebsocket:`. `NODE_ENV` навмисно не додано (запасне джерело для `APP_ENV`). `config/turn.ts` поки ніхто не імпортує.

- **Є в `.env.example`, але код не читає (8):** `UNIX_PATH` (код читає `APP_UNIX_PATH`), `DATABASE_URL` (діють `PGSQL_*`), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `XAI_IMAGE_API_URL`, `XAI_IMAGE_EDIT_API_URL`, `XAI_IMAGE_MODEL`, `XAI_IMAGE_FORMAT`.
- **Код читає, але немає в `.env.example` (26):** `AI_TEXT_DRIVER`, `API_PATH_PREFIX`, `APP_MAX_BODY_SIZE`, `APP_MAX_JSON_BODY_SIZE`, `APP_MAX_MULTIPART_BODY_SIZE`, `APP_MAX_OCTET_BODY_SIZE`, `APP_UNIX_PATH`, по три змінні `CLIENT_ID`/`CLIENT_SECRET`/`REDIRECT_URI` для `GOOGLE_`, `FACEBOOK_`, `GITHUB_`, `GITLAB_` (12), `OAUTH_FRONTEND_SUCCESS_URL`, `OAUTH_FRONTEND_ERROR_URL`, `MISTRAL_API_KEY`, `MISTRAL_TEXT_MODEL`, `NODE_ENV`, `TURN_SECRET`, `TURN_HOST`.
- **Інше:** у `.env.example` `REDIS_PREFIX=promo_designer:`, а default у коді `uwebsocket:` — схоже на залишок з іншого проєкту.
- **Пропозиція:** синхронізувати `.env.example` з кодом; повний перелік із призначенням і default-значеннями є на сторінці `documentation/backend/configuration.md`.

### 7. Потрібен pgvector, ніде не задокументовано

> **Виправлено** у feat-007 (гілка `feat/db-dx`): розділ [«pgvector»](https://blazheiko.github.io/itvibe-template/backend/database#pgvector) у `documentation/backend/database.md` пояснює, навіщо потрібне розширення (пошук у базі знань Support AI), що буде без нього, як його встановити й перевірити; на нього посилаються `README.md`, `packages/backend/README.md`, `getting-started`, `ai`, `deployment`, `repositories-transformers`.

- **Що:** `src/db/create-database.ts` виконує `CREATE EXTENSION IF NOT EXISTS vector`. На звичайному образі `postgres` команда `db:create` падає.
- **Пропозиція:** згадати pgvector у README (у документації вже є, образ `pgvector/pgvector:pg16`).

### 8. Різні PostgreSQL defaults у застосунку та скриптах

> **Виправлено** у feat-006: застосунок, `db:create` і `drizzle.config.ts` (перейменовано з `.js`) беруть налаштування з однієї `resolveDatabaseConfig()`.

- **Що:** `drizzle.config.js` і `src/db/create-database.ts` мають defaults (`127.0.0.1`, `5432`, `postgres`, `itvibe_template`). `src/config/database.ts` defaults не має (див. також п. 5).
- **Наслідок:** міграції можуть піти в одну БД, а застосунок не стартувати або підключитися не туди.
- **Пропозиція:** один спільний модуль конфігурації БД для застосунку і скриптів.

## База даних і структура

### 10. `db:seed` — порожня заглушка

> **Виправлено** у feat-007 (гілка `feat/db-dx`) за планом [`db-seed-plan.md`](./db-seed-plan.md): `db:seed` ідемпотентно вставляє три промпти `llm_system_prompts` (тексти — ті самі runtime-fallback з `config/support.ts`), а з `--demo` — адміна і, опційно, звичайного користувача з `SEED_*`. Додано `db:seed:prod`.

- **Що:** `src/db/seed.ts` містить лише `import "dotenv/config"`. Команда виконується успішно, але нічого не робить.
- **Пропозиція:** додати мінімальні seed-дані (тестовий користувач/адмін) або прибрати скрипт.

### 11. `src/drizzle/schema/index.ts` порожній

> **Виправлено** у feat-007 (гілка `feat/db-dx`): видалено порожні `src/drizzle/schema/index.ts`, а також такі самі порожні й ніде не імпортовані `src/drizzle/schema-validator.ts`, `type-guards.ts`, `types.ts`. У `src/drizzle/` лишилися тільки міграції; схема — `src/database/schema.ts`. Аліас `#drizzle/*` залишено, хоча зараз його ніхто не імпортує.

- **Що:** реальна схема лежить у `src/database/schema.ts` (на неї вказує `drizzle.config.js`), а `src/drizzle/schema/index.ts` порожній. Це вводить в оману.
- **Пропозиція:** видалити порожній файл або реекспортувати з нього схему.

Додатково (не баг): Relational Queries v2 (`src/database/relations.ts`) підключено, але жоден repository не використовує `db.query`. Транзакцій (`db.transaction`) у коді застосунку немає.

## HTTP

### 12. Тіло запиту читається лише для `post`/`put`

> **Виправлено** у feat-008 (гілка `feat/http-body-fixes`) за планом [`http-body-methods-plan.md`](./http-body-methods-plan.md): `patch` читає й валідує тіло; `validator` на `get`/`delete`/`del` заборонено типами `defineRoute` і перевіркою в `routesHandler`; маршрут з `validator` без `Content-Type` дає 422 (порожнє тіло валідується як `{}`) або 415 (є framing тіла) замість 500. Контракт `octet`-маршрутів з `validator` лишається відкритим.

- **Що:** у `src/vendor/start/server.ts` `hasBody` істинний лише для `post` і `put`. Body `PATCH` і `DELETE` ніколи не читається.
- **Наслідок:** зараз `patch`-маршрутів немає, але новий `patch`-маршрут мовчки отримає порожній payload.
- **Пропозиція:** додати `patch` (і за потреби `del`) до методів з body або явно заборонити `patch` у `defineRoute`.

### 13. `sendResponse` при `payload === null`

> **Виправлено** у feat-008 (гілка `feat/http-body-fixes`) за планом [`http-null-payload-plan.md`](./http-null-payload-plan.md): порожній payload (`null`/`undefined`) у 200 дає 204, в іншому 2xx — той самий статус без тіла; 204/205/3xx завжди без тіла й без `Content-Type` (зокрема з `responseData.headers`); у 4xx/5xx — канонічне тіло помилки з `code` зі спільного `ErrorCode`.

- **Що:** якщо `payload` дорівнює `null`, тілом відповіді стає `String(status)`, хоча `Content-Type: application/json`.
- **Пропозиція:** віддавати `null` або порожнє тіло зі статусом 204.

### 14. Прогалини плану body limits

Згідно з `src/docs/HTTP_BODY_LIMITS_PLAN.md` основну частину реалізовано: ліміти за типом, 413, рання відмова, `onAborted`. Не зроблено:

- unit-тести для `detectBodyKind` / `resolveMaxBodySize` та інтеграційні тести на 413;
- змінні `APP_MAX_*_BODY_SIZE` у `.env.example` (див. п. 6);
- показ лімітів у playground через `serializeRoutes`;
- default-значення відрізняються від плану: у коді 2 MB / 50 MB / 50 MB / 2 MB, у плані 1 MB / 50 MB / 100 MB / 1 MB. Потрібно вирішити, що правильно.

## Документація та стиль

### 15. Застарілі внутрішні документи

| Документ                                 | Стан                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/docs/SESSION_SECURITY.md`           | TTL 2h і `sameSite: Strict`, а в коді 24h і `Lax`; формат cookie застарів; немає `__Host-` і CSRF        |
| `src/vendor/start/SECURITY_ANALYSIS.md`  | 12 з 15 findings виправлено; C-2, M-5 частково; L-4 відкритий                                            |
| `src/docs/etag-improvements.md`          | описує ETag, якого вже немає (зараз SHA1 content hash)                                                   |
| `src/docs/VALIDATOR_ABSTRACTION_PLAN.md` | рефакторинг здебільшого виконано; варто перетворити на ADR                                               |
| `src/vendor/directory-structure.md`      | перелічує неіснуючі файли, пропускає теки                                                                |
| `src/scripts/README.md`                  | описує скрипти, яких немає в `package.json` (`copy:static`, `export-types`), nodemon замість `tsx watch` |
| `README.md` (корінь)                     | дерево репозиторію без пакета `documentation`                                                            |
| `packages/backend/README.md`             | drift-список не згадує `SERVE_STATIC` (п. 4) і pgvector (п. 7)                                           |

Також: `api-playground` не має скрипта `test`.

### 16. Стиль коду бекенду

Багато файлів бекенду використовують подвійні лапки і крапку з комою, тоді як `AGENTS.md` описує одинарні лапки без крапки з комою. На `main` `pnpm format:check` падає на 193 файлах.

## WebSocket (знайдено під час T6.4, feat-011)

### 17. Фронтенд вшиває префікс `api/` у WS-події

- **Що:** `packages/frontend/src/composables/useWebSocketConnection.ts` (і `utils/websocket-base.ts`) формує подію як `` `api/${route}` ``, а ключі WS-маршрутів на сервері залежать від `API_PATH_PREFIX`.
- **Наслідок:** з будь-яким префіксом, крім `api`, усі WS-виклики отримують `not_found`.
- **Пропозиція:** брати префікс з конфігурації фронтенду (env) або з відповіді сервера.

### 18. WS upgrade без валідної сесії не відхиляється

- **Що:** у `src/vendor/utils/network/ws-handlers.ts` токен неправильного формату отримує `401`. Але для токена правильного формату без живої сесії (`onUpgrade` повертає `null`) upgrade все одно виконується, і з'єднання закривається в `onOpen` кодом `4001`.
- **Наслідок:** зайве відкриття з'єднань. Разом із п. 2 (немає ліміту на upgrade) це спрощує флуд.
- **Пропозиція:** відповідати `401` до `res.upgrade`, якщо `dataAccess === null`.

### 19. Мертвий код у WebSocket-шарі

- `src/app/state/user-storage.ts` ніде не імпортується; стан з'єднань живе в `src/app/websocket/ws-connection-registry.ts`.
- Гілка «Event not found» в `onMessage` (`ws-handlers.ts`) недосяжна: диспетчер сам повертає `not_found` «Route not found».
- `packages/frontend/src/utils/websocket-base.ts` має власну логіку reconnect/ping, але `useWebSocketConnection` використовує з нього лише типи.
- **Пропозиція:** видалити або явно позначити як legacy.

## Шари, БД і валідація (знайдено під час T6.1–T6.3, feat-011)

### 20. Сервіси push-нотифікацій звертаються до БД напряму

- **Що:** `src/app/services/notifications/push-notification-sender-service.ts` імпортує `db` і робить `db.insert(pushNotificationLogs)`; `src/app/services/statistics/push-subscription-statistics-service.ts` робить `db.select` по `pushNotificationLogs`. Обидва оминають репозиторій.
- **Пропозиція:** винести запити в `push-subscription-repository` (або окремий `push-notification-log-repository`).

### 21. N+1 у `findByUserIdWithLogs` і статистика в JS

- **Що:** `src/app/repositories/notifications/push-subscription-repository.ts` → `findByUserIdWithLogs` робить окремий запит логів на кожну підписку (`subscriptionsData.map(async …)`). Сервіс статистики завантажує всі логи і рахує агрегати в JavaScript.
- **Пропозиція:** один запит з `inArray`/join; агрегати через `count()`/`group by` у SQL.

### 22. Контролери та middleware оминають сервіси

- **Що:** `src/app/controllers/http/admin/admin-user-controller.ts`, `src/app/middlewares/admin-guard.ts`, `src/app/websocket/ws-coordinator.ts` викликають `userRepository` напряму. `prompt-controller.ts` і `ai/usage/llm-usage-controller.ts` імпортують типи з модулів репозиторіїв.
- **Наслідок:** ланцюжок Controller → Service → Repository із `documentation/backend/architecture.md` не суворий.
- **Пропозиція:** перенести виклики в сервіси або явно задокументувати дозволені винятки (наприклад, guard).

### 23. `prompt-controller` сам викликає OpenAI і кидає `Error`

- **Що:** `src/app/controllers/http/ai/prompt-controller.ts` робить `fetch` до OpenAI і кидає `throw new Error(...)` замість `AppError`/`Result` через сервіс. Помилки провайдера йдуть клієнту як `500`.
- **Пропозиція:** винести в AI-сервіс (є `textAdapter`), повертати доменні помилки.

### 24. Repositories barrel неповний

- **Що:** `src/app/repositories/index.ts` не експортує `promptRepository`, `supportRepository`, `supportKnowledgeRepository`, тому частина коду імпортує через barrel, а частина напряму. `user-online-repository.ts` імпортує `logger` (логування в шарі даних).
- **Пропозиція:** доповнити barrel, прибрати логування з репозиторію.

### 25. `clearEmbedding` без транзакції

- **Що:** `src/app/repositories/support/support-knowledge-repository.ts` → `clearEmbedding` робить два запити без `db.transaction`; SQL для embedding містить назви таблиці й колонок рядками.
- **Пропозиція:** транзакція і посилання на колонки через `sql` з об'єктами схеми.

### 26. ArkType-адаптер віддає лише `summary`

- **Що:** `src/app/validate/adapters/arktype-adapter.ts` повертає один `summary` як повідомлення; масив `messages[]` у помилці 422 не містить помилок по окремих полях.
- **Пропозиція:** мапити `ArkErrors` у список `{ path, message }`.

### 27. Мертвий і застарілий код

- `src/app/validate/schemas/schemas.ts` — його імпорти закоментовані в `src/index.ts` і `vendor/start/server.ts`.
- `src/app/validate/errors/validation-error.ts` — docstring «ArkType validation», хоча клас не залежить від рушія.
- `src/vendor/utils/routing/serialize-routes.ts` — змінна `nativeValidator` насправді містить ArkType-опис.
- `src/app/controllers/http/core/main-controller.ts` — `testSentryError` не зареєстрований у маршрутах (у продакшні недоступний), мертвий handler.
- `packages/backend/README.md` (~рядок 343) пише `ValidationError → 400`, а код повертає `422` (`validation-error.ts`).
- `src/docs/VALIDATOR_ABSTRACTION_PLAN.md`: не зроблено §3.6 (`InputSchema` export), §9 (`nativeValidator(predicate)`), §5.6 (`ResponseSchema`/`BaseType` у `vendor/types`).

## Деплой (знайдено під час T6.8b, feat-011)

Перевірено реальним `docker build` (успішно, ~206 с, образ 817 MB) і `docker run` (без БД падає на `db:create:prod` з `ECONNREFUSED`, exit 1).

### 28. Немає `.dockerignore`

- **Що:** у корені немає `.dockerignore`, а `Dockerfile` робить `COPY . .`.
- **Наслідок:** у build context і builder-шар потрапляють локальні `.env`, `node_modules`, `dist`. Збірка повільніша, і є ризик витоку секретів у шари образу.
- **Пропозиція:** додати `.dockerignore` (`**/node_modules`, `**/dist`, `**/.env*` крім `.env.example`, `.git`, `documentation/.vitepress/{cache,dist}`).

### 29. Контейнер працює від root, без `HEALTHCHECK`

- **Що:** у `Dockerfile` немає `USER` і `HEALTHCHECK`.
- **Пропозиція:** `USER node`; `HEALTHCHECK` через `GET /api/ping`.

### 30. `CMD` через `sh -c`

- **Що:** `CMD ["sh", "-c", "node --version && pnpm db:create:prod && pnpm db:migrate && pnpm start"]`.
- **Наслідок:** міграції виконуються на кожному старті контейнера, і при кількох репліках виникає гонка. PID 1 тут — shell, тому SIGTERM може не дійти до Node, і graceful shutdown з `src/index.ts` не спрацює.
- **Пропозиція:** окремий одноразовий job для `db:create:prod`/`db:migrate`; `CMD ["node", "dist/index.js"]` (або `exec`/`tini`).

### 31. Образ не вмикає `SERVE_STATIC` і не задає `APP_ENV`

> **Виправлено** у feat-006 разом з п. 4.

- **Що:** `Dockerfile` копіює фронтенд у `public`, але не встановлює `SERVE_STATIC=true`, тож за замовчуванням контейнер фронтенд не роздає. Задано `NODE_ENV=production`, але не `APP_ENV`, а саме його читають `secure` у cookie і конфіг CSP.
- **Пропозиція:** задати `SERVE_STATIC=true` і `APP_ENV=production` в образі або явно описати їх як обов'язкові при запуску.

### 32. `corsS3.xml`: `AllowedOrigin *` разом з `PUT`

- **Що:** CORS-конфіг бакета дозволяє будь-яке джерело для `GET`/`POST`/`PUT`.
- **Пропозиція:** обмежити `AllowedOrigin` доменами застосунку; для продакшну тримати окремий файл.

## Observability (знайдено під час T6.6, feat-011)

### 33. `handleError` логує без `requestId`, контекст без `userId`

- **Що:** `handleError` у `src/vendor/start/server.ts` пише через глобальний `logger`, а не через дочірній logger запиту. Тому warn-записи (413/415/422) не мають `requestId`. Дочірні логери в `src/vendor/utils/context/http-context.ts` і `ws-context.ts` отримують лише `requestId`, без `userId`.
- **Пропозиція:** передавати request logger у `handleError`; додати `userId` (коли відомий) у child-контекст.

### 34. Рівень логування не налаштовується

- **Що:** `src/vendor/utils/logger.ts` створює pino без `level` (діє default `info`), змінної `LOG_LEVEL` немає. Увімкнути `debug` без зміни коду неможливо.
- **Пропозиція:** `level: env.LOG_LEVEL ?? 'info'` і документування в `.env.example`.

### 35. Немає readiness-перевірки

- **Що:** `GET /api/ping` повертає статичний `{status:"ok"}` (liveness) і не перевіряє PostgreSQL, Redis, S3 чи SMTP. Окремого readiness-маршруту немає.
- **Наслідок:** оркестратор/балансувальник спрямує трафік на інстанс без доступу до БД чи Redis.
- **Пропозиція:** `GET /api/ready` з перевіркою DB і Redis (таймаути, без деталей у відповіді). Вимоги — шаблон `docs/requirements/operations/template-health-readiness-observability.md`.

## Тестування (знайдено під час T6.8a, feat-011)

Реальний прогін: `pnpm --filter backend test` — 51 файл, 268 тестів, ~2,2 с. Тести не потребують БД чи Redis, uWS мокається.

### 36. Немає CI для тестів застосунку і coverage

- **Що:** єдиний workflow — `.github/workflows/docs.yml`, і він тестує лише пакет `documentation`. Backend-, frontend- і shared-тести, typecheck та lint в CI не запускаються, лише локально через `./init.sh`. Coverage-інструментів чи скриптів немає в жодному пакеті.
- **Пропозиція:** workflow `ci.yml` на PR (`pnpm typecheck`, `pnpm lint`, `pnpm test`, за потреби e2e); `@vitest/coverage-v8` зі звітом.

### 37. `vitest.config.ts` без `testTimeout`

- **Що:** `packages/backend/vitest.config.ts` не задає `testTimeout`, тож діє default 5 с. Під час feat-003 7 з 268 тестів один раз впали з таймаутом при паралельному навантаженні (typecheck + lint). При повторних прогонах — 268/268.
- **Пропозиція:** явний `testTimeout` і/або обмеження `poolOptions` для CI.

### 38. Playwright `webServer` використовує `npm`

- **Що:** `packages/frontend/playwright.config.ts` запускає `npm run dev` / `npm run preview`, хоча репозиторій — pnpm-workspace.
- **Пропозиція:** `pnpm dev` / `pnpm preview`.

## Кешування (знайдено під час T6.7, feat-011)

### 39. Річний `immutable` для всіх не-HTML файлів

- **Що:** `src/vendor/start/static-server.ts` віддає `public, max-age=31536000, immutable` для кожного не-HTML файлу, а не лише для хешованих `/assets/*`. Під нього потрапляють `manifest.json`, `favicon.svg`, `/icons/*`, `/audio/*` і `service-worker.js` (збирається з фіксованим ім'ям у `packages/frontend/vite.sw.config.ts`).
- **Наслідок:** зміни в цих файлах без зміни імені клієнти можуть не бачити до року. Скрипт SW браузер перевіряє в обхід HTTP-кешу, але маніфест, іконки й аудіо — ні.
- **Пропозиція:** `immutable` лише для `/assets/` (хешовані імена), для решти `no-cache` або короткий `max-age`.

### 40. `If-None-Match` порівнюється як точний рядок

- **Що:** у `static-server.ts` перевірка `ifNoneMatch === etag`. Списки ETag, `*` і слабкі `W/"…"` не обробляються.
- **Пропозиція:** розбирати заголовок за RFC 9110.

### 41. Статика повністю в RAM без стиснення і ліміту

- **Що:** увесь `public` читається в пам'ять на старті без ліміту розміру; gzip/brotli немає.
- **Пропозиція:** попередньо стиснуті `.br`/`.gz` при збірці; ліміт або стрімінг для великих файлів; або роздача статики через CDN/проксі (`CDN_URL`).

### 42. API JSON без `Cache-Control: no-store`

- **Що:** `sendResponse` у `src/vendor/start/server.ts` не ставить `Cache-Control` на JSON-відповіді, зокрема на auth- і session-відповіді.
- **Наслідок:** проміжні кеші або браузер можуть зберігати персональні дані з відповідей.
- **Пропозиція:** `Cache-Control: no-store` за замовчуванням для API.

### 43. Кеш промптів у пам'яті процесу без TTL

- **Що:** `src/app/services/ai/prompt-service.ts` тримає `Map` промптів у процесі без TTL та інвалідації між інстансами.
- **Наслідок:** оновлення промпту на одному інстансі не видно на інших до рестарту.
- **Пропозиція:** TTL або інвалідація через Redis pub/sub.

## Інтеграції: S3, пошта/push, AI (знайдено під час T6.5a–c, feat-011)

### 44. `deleteFromS3` без `buildKey`

- **Що:** у `src/vendor/utils/storage/s3.ts` `upload`/`getSignedUrl`/`download` застосовують `buildKey` (префікс), а `deleteFromS3` — ні. Тому `avatar-service.ts` і `knowledge-base-service.ts` мають власні копії `buildFullS3Key`. Виклик з відносним ключем мовчки нічого не видаляє.
- **Пропозиція:** `buildKey` у `deleteFromS3`, прибрати дублікати.

### 45. Аватари без `public-read`

- **Що:** `src/app/services/user/avatar-service.ts` завантажує аватари без `publicRead`, а фронтенд читає їх напряму за CDN URL. Вони відображаються лише тоді, коли бакет або CDN зроблено публічними поза кодом.
- **Пропозиція:** явно задати політику: `publicRead` для аватарів або видача через signed URL.

### 46. MIME-тип довіряється заголовку клієнта

- **Що:** `avatar-service.ts` і `knowledge-base-service.ts` перевіряють MIME за multipart-заголовком, без перевірки сигнатури вмісту. Розширення аватара береться з імені файлу клієнта.
- **Пропозиція:** перевіряти magic bytes; розширення виводити з перевіреного типу.
- Також: оскільки всі завантаження йдуть через бекенд, `PUT`/`POST` у `corsS3.xml` не потрібні (доповнює п. 32).

### 47. Підписка push перепризначається іншому користувачу

- **Що:** `push-subscription-service.ts` → `createSubscription` шукає endpoint серед усіх користувачів і викликає `updateByEndpoint(endpoint, userId, …)`, що переносить підписку на поточного користувача.
- **Наслідок:** ризик невеликий, бо endpoint — секретний URL від push-сервісу. Але поведінка неявна (наприклад, при зміні акаунта на тому ж пристрої це бажано, при витоку endpoint — ні).
- **Пропозиція:** явно задокументувати або обмежити перенесення (наприклад, лише з тим самим `p256dh`/`auth`).

### 48. `GET /test-push` з побічними ефектами

- **Що:** у `src/app/routes/http-routes.ts` `test-push` має метод `get`, але надсилає push і пише логи. `csrf_guard` перевіряє лише небезпечні методи (`UNSAFE_METHODS`), тож маршрут від CSRF не захищено.
- **Пропозиція:** `POST`.

### 49. Push надсилається лише з `test-push`

- **Що:** `push-notification-sender-service.ts` → `sendToUser` викликається тільки з `test-push`; жодна бізнес-подія push не надсилає, `skipIfOnline`/`notificationType` не використовуються. Підписки обробляються послідовно, з двома `await`-записами в БД на кожну.
- **Пропозиція:** підключити до реальних подій; паралельна відправка з обмеженням і пакетний запис логів.

### 50. Невідомий `AI_TEXT_DRIVER` мовчки дає Mistral

- **Що:** `src/app/services/ai/ai-provider.ts` повертає `mistralaiTextAdapter` для будь-якого значення, крім `openai` і `xai`, тож друкарська помилка не помітна.
- **Пропозиція:** валідація в `validate-runtime-config.ts` з помилкою на старті.

### 51. Виклики AI-провайдерів без timeout

- **Що:** адаптери в `src/app/services/ai/adapters/*` і `prompt-controller.ts` не передають timeout чи `AbortSignal`.
- **Пропозиція:** таймаут і скасування при закритті WS/HTTP.

### 52. Support AI: `langNative = 'ru'` зашито в коді

- **Що:** `src/app/services/support/support-service.ts` у `chat()` і `openChat()` задає `const langNative = 'ru'`, ігноруючи мову користувача.
- **Пропозиція:** брати мову з профілю/запиту.

### 53. Неповний облік використання AI

- **Що:** переклад (`support-query-translation-service.ts`) і тест промпту (`prompt-controller.ts`) не передають `onComplete`, тому `SUPPORT_QUERY_TRANSLATION` і `PROMPT_TEST` не записуються. Embeddings не обліковуються. `mistralai-text-adapter.ts` мовчки пропускає запис, якщо провайдер не повернув usage.

### 54. Embeddings

- **Що:** `src/database/schema.ts` має `vector(1536)`, хоча `OPENAI_EMBEDDING_DIMENSIONS` налаштовується: зміна змінної без міграції зламає запис. `support-embedding-service.ts` → `reindexAll` шле всі статті одним `embedBatch`. `searchByEmbedding` (`support-knowledge-repository.ts`) не має порогу відстані, тож у контекст завжди йде до 5 статей.

### 55. `llm_text_usage.final_prompt` зберігає повні тексти

- **Що:** у `llm_text_usage.final_prompt` безстроково зберігаються повні повідомлення користувачів та історія, і адміністратор бачить їх через `/admin/usage/text`.
- **Наслідок:** персональні дані без політики зберігання.
- **Пропозиція:** retention-політика, маскування, або зберігати лише метадані.

## Пакети shared, frontend, playground (знайдено під час T6.9a–c, feat-011)

### 56. Тест shared не містить жодного тесту

- **Що:** `packages/shared/test/languages.test.js` має лише два імпорти (`node:test`, `node:assert/strict`) без жодного тест-кейсу. Тому `pnpm test` для shared показує `pass 1`: це «пройдений» файл, а не реальний тест.
- **Пропозиція:** тести для schemas/utils (наприклад, `utils/phone`, enums мов) або прибрати скрипт.

### 57. `guards` у shared порожні

- **Що:** `packages/shared/src/guards/index.ts` містить лише `export {}`; реекспорт закоментовано в `src/index.ts`, але `./guards` є в `exports` `package.json`.
- **Пропозиція:** видалити з `exports` або наповнити.

### 58. `EntityIdSchema` не брендований

- **Що:** `packages/shared/src/brands/ids.ts` описує `EntityIdSchema` як regex-тип без `.brand(...)`, тож тека `brands` не дає брендованих типів.

### 59. Фронтенд: fallback `VITE_BASE_URL`

- **Що:** `packages/frontend/src/utils/base-api.ts` без `VITE_BASE_URL` бере `https://itvibe-template.example`, тож у dev запити оминають Vite proxy, доки змінну не задано.
- **Пропозиція:** fallback на відносний шлях (same-origin через proxy).

### 60. Фронтенд: `console.log(data)` з `wsToken`

> **Виправлено** у feat-014: `console.log(data)` прибрано з `App.vue`; у production-збірці `console.log/info/debug/trace` вирізаються через `esbuild.pure` (`packages/frontend/vite.console.ts`).

- **Що:** `packages/frontend/src/App.vue` → `initializeApp` має `console.log(data)`, що друкує всю відповідь init, зокрема користувача і `wsToken`, у консоль браузера (і, можливо, в Sentry breadcrumbs).
- **Пропозиція:** прибрати; доповнює п. 3 (токени в логах).

### 61. Фронтенд: нетипізовані змінні та застарілі коментарі

- **Що:** `packages/frontend/src/env.d.ts` типізує лише `VITE_BASE_URL`, а не `VITE_AUTH_PHONE_ENABLED` і `VITE_SENTRY_*`. У `main.ts` закоментований код push-дозволів і коментар про перевірку оновлень «щохвилини», хоча вона одноразова.

### 62–64. API Playground

- **62:** `packages/api-playground/src/stores/api-doc.ts` викликає `fetch('/api/doc/routes')`, ігноруючи `baseUrl` і `API_PATH_PREFIX`; Vite proxy теж обмежений `/api`.
- **63:** `src/components/api/TestFormWs.vue` перетворює `https://` на `ws://` замість `wss://`.
- **64:** `src/composables/useWebSocketConnection.ts` → `sendMessage` без з'єднання логує «message queued», але черги немає, і повідомлення губиться.
- Також: у playground немає скрипта `test`.

## Процес, toolchain, ролі (знайдено під час T6.10a–d, feat-011)

### 65. `POST /main/save-user`: анонімне створення користувача з паролем у відкритому тексті — КРИТИЧНО

> ✅ **Виправлено у feat-012 (2026-10-20):** маршрут, `MainController.saveUser`, `mainService.saveUser`, схеми `SaveUserInput`/`SaveUserResponse`/`WSSaveUserPayload` і `api.saveUser` на фронтенді видалено. Залишається перевірити БД на записи, створені через цей маршрут: усі хеші від `hashPassword` (metautil) мають префікс `$scrypt$`, тож нехешовані паролі знаходить запит
>
> ```sql
> SELECT id, email, created_at FROM users
> WHERE password IS NOT NULL AND password NOT LIKE '$scrypt$%';
> ```
>
> Таким записам варто скинути пароль (наприклад, `password = NULL` + примусовий reset) або видалити їх, якщо це тестові акаунти.

- **Що:** у `src/app/routes/http-routes.ts` маршрут `POST /<prefix>/main/save-user` входить у групу `main` лише з `session_web` і `csrf_guard`, без `auth_guard`. CSRF за замовчуванням лише логується (`CSRF_ENFORCE=false`). `mainService.saveUser` (`src/app/services/core/main-service.ts`) викликає `userRepository.create({ name, email, password: payload.password })`, а `user-repository.ts` вставляє дані як є. Хешування немає, хоча звичайна реєстрація використовує `hashPassword` з `metautil` (`auth-service.ts`).
- **Наслідок:** будь-хто анонімно створює акаунти в обхід реєстрації (верифікація email, throttling), а пароль зберігається в БД **відкритим текстом**.
- **Пропозиція:** видалити маршрут (схоже на залишок демо) або закрити `admin_guard` і хешувати пароль. Перевірити БД на вже створені записи з нехешованими паролями.

### 66. `users.isAdmin` — мертве поле

- **Що:** `src/database/schema.ts` має і `isAdmin` (`is_admin`), і `role` (`user`/`admin`). `admin-guard.ts`, фронтенд-стор `isAdmin()` і WS-сервіс адмін-каналу перевіряють лише `role`.
- **Пропозиція:** видалити `is_admin` міграцією або синхронізувати з `role`.

### 67. Push-група без `auth_guard`

- **Що:** група `push-subscriptions` у `http-routes.ts` не має `auth_guard`; автентифікація перевіряється в контролері через `getUserId()`; `vapid-public-key` доступний анонімно (це нормально). WS-маршрут `admin/subscribe_online_users` без guard — роль перевіряється в `admin-ws-channel-service.ts`.
- **Пропозиція:** декларативні guard'и на маршрутах, щоб матриця доступу читалася з `http-routes.ts`.

### 68. ESLint `strictTypeChecked` фактично вимкнено

- **Що:** `eslint.config.ts` для backend, frontend і api-playground вимикає більшість правил `strictTypeChecked`, тож суворий профіль діє лише на shared і кореневі файли. У корені немає `.prettierrc` — backend і shared форматуються дефолтами Prettier (доповнює п. 16).

### 69. `AGENTS.md`: застарілий опис

- **Що:** розділ «Commit & Pull Request Guidelines» стверджує, що «this checkout does not include .git history», хоча історія є.

### 70. Основний Redis-клієнт без таймауту

Знайдено під час ручної перевірки feat-013.

- **Що:** `src/database/redis.ts` створює ioredis без `commandTimeout` і з offline queue за замовчуванням (`maxRetriesPerRequest: 20`). Коли Redis недоступний, кожен запит, що читає сесію (HTTP-middleware сесії, `verifyUpgradeToken`), чекає ~45 с і завершується `500 MaxRetriesPerRequestError`.
- **Наслідок:** під час збою Redis запити накопичуються замість швидкої відмови; у `APP_ENV=local` текст помилки ioredis потрапляє у відповідь.
- **Пропозиція:** `commandTimeout` і менший `maxRetriesPerRequest` для основного клієнта (з урахуванням того, що сесії мають переживати короткі збої), швидка `503` при недоступному Redis; readiness-перевірка (п. 35).

> **Виправлено** у feat-016 (гілка `feat/redis-main-client-timeout`) за планом [`redis-main-client-timeout-plan.md`](./redis-main-client-timeout-plan.md): основний клієнт без offline queue і повторів, з таймаутом `REDIS_COMMAND_TIMEOUT_MS` (500 мс); недоступний Redis дає `503 service_unavailable` з `Retry-After: 1` без тексту ioredis; одна подія Sentry на інцидент (`redis-health.ts`); WS-з'єднання не закриваються, heartbeat не залежить від Redis, upgrade — `503`; `logoutAll` обмежений `REDIS_LOGOUT_ALL_DEADLINE_MS`. Readiness-перевірка (п. 35) — окремо.

## Що варто зробити далі

Пропоную оформити окремі записи в `feature_list.json` (через PR у `main`):

0. ~~Негайно: п. 65 (`save-user`)~~ — виправлено у feat-012.
1. **security-hardening** — п. 1, 2, 3, 9, 18, 32, 42, 46, 47, 48, 60, 67.
2. **env-example-sync** — п. 4, 5, 6, 8 (+ README).
3. **db-dx** — п. 7, 10, 11.
4. **http-body-fixes** — п. 12, 13, 14.
5. **internal-docs-cleanup** — п. 15 (видалити або оновити застарілі документи).
6. **format-baseline** — п. 16.
7. Окремої фічі поки немає: п. 17 і 19 — кандидати в новий запис (WebSocket cleanup).
8. Окремої фічі поки немає: п. 20–25 — кандидати в новий запис (layering & data access cleanup);
   п. 26 — до feat-008 або окремо; п. 27 — до feat-009.
9. Окремої фічі поки немає: п. 28–31 — кандидати в новий запис (Docker hardening).
10. Окремої фічі поки немає: п. 33–35 — кандидати в новий запис (observability: логування та readiness).
11. Окремої фічі поки немає: п. 36–38 — кандидати в новий запис (CI для застосунку + coverage).
12. Окремої фічі поки немає: п. 39–41, 43 — кандидати в новий запис (static/caching).
13. Окремої фічі поки немає: п. 44, 45, 49 — storage/push cleanup; п. 50–55 — AI reliability & privacy.
14. Окремої фічі поки немає: п. 56–58 — shared cleanup + тести; п. 59, 61 — frontend; п. 62–64 — playground.
15. п. 66 — db-dx (feat-007); п. 68 — format-baseline (feat-010); п. 69 — internal-docs-cleanup (feat-009).
