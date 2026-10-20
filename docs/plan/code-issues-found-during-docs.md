# Проблеми в коді, знайдені під час написання документації (feat-003)

Знайдено під час написання сторінок v1 (feat-003). Перевірено читанням коду та прогоном на чистому клоні.
Нічого з переліченого **не виправлено**: це поза обсягом feat-003 (документація без змін коду).
Кожен пункт — кандидат на окремий запис у `feature_list.json` або issue.

Шляхи відносно `packages/backend/`, якщо не вказано інше.

## Зведення

| #   | Проблема                                                              | Серйозність  | Область                      |
| --- | --------------------------------------------------------------------- | ------------ | ---------------------------- |
| 1   | CSP ніде не застосовується                                            | Висока       | Безпека                      |
| 2   | Немає rate limit на WebSocket upgrade і глобального per-IP ліміту     | Висока       | Безпека                      |
| 3   | WS-токен і `userToken` потрапляють у логи                             | Середня      | Безпека                      |
| 4   | `SERVE_STATIC=true` у `.env.example` ламає запуск                     | Середня      | DX / конфігурація            |
| 5   | Fallback `PGSQL_PORT` не працює → `NaN`                               | Середня      | Конфігурація                 |
| 6   | Розбіжності `.env.example` з кодом                                    | Середня      | Конфігурація                 |
| 7   | Потрібен pgvector, ніде не задокументовано                            | Низька       | DX / БД                      |
| 8   | Різні PostgreSQL defaults у застосунку та скриптах                    | Низька       | Конфігурація                 |
| 9   | `broadcastToChannel` без runtime-перевірки каналу (L-4)               | Низька       | Безпека                      |
| 10  | `db:seed` — порожня заглушка                                          | Низька       | DX / БД                      |
| 11  | `src/drizzle/schema/index.ts` порожній                                | Низька       | Структура                    |
| 12  | Тіло запиту читається лише для `post`/`put`                           | Низька       | HTTP                         |
| 13  | `sendResponse` при `payload === null` віддає `String(status)` як JSON | Низька       | HTTP                         |
| 14  | Прогалини плану body limits: тести, `.env.example`, playground        | Низька       | HTTP / тести                 |
| 15  | Застарілі внутрішні документи                                         | Низька       | Документація                 |
| 16  | Стиль коду бекенду не відповідає `AGENTS.md`                          | Інформаційна | Стиль                        |
| 17  | Фронтенд вшиває префікс `api/` у WS-події                             | Середня      | WebSocket / frontend         |
| 18  | WS upgrade без валідної сесії не відхиляється                         | Низька       | WebSocket / безпека          |
| 19  | Мертвий код у WebSocket-шарі                                          | Низька       | WebSocket / структура        |
| 20  | Сервіси push-нотифікацій звертаються до БД напряму                    | Середня      | Шари / БД                    |
| 21  | N+1 у `findByUserIdWithLogs` і статистика в JS                        | Середня      | Продуктивність               |
| 22  | Контролери та middleware оминають сервіси                             | Низька       | Шари                         |
| 23  | `prompt-controller` сам викликає OpenAI і кидає `Error`               | Середня      | Шари / помилки               |
| 24  | Repositories barrel неповний, змішані стилі імпорту                   | Низька       | Структура                    |
| 25  | `clearEmbedding` — два запити без транзакції, сирий SQL з назвами     | Низька       | БД                           |
| 26  | ArkType-адаптер віддає лише `summary`, без помилок по полях           | Низька       | Валідація                    |
| 27  | Мертвий і застарілий код валідації та контролерів                     | Низька       | Структура                    |
| 28  | Немає `.dockerignore`                                                 | Середня      | Docker / безпека             |
| 29  | Контейнер працює від root, без `HEALTHCHECK`                          | Середня      | Docker / безпека             |
| 30  | `CMD` через `sh -c`: міграції на кожному старті, сигнали              | Середня      | Docker / експлуатація        |
| 31  | Образ не вмикає `SERVE_STATIC` і не задає `APP_ENV`                   | Низька       | Docker / конфігурація        |
| 32  | `corsS3.xml`: `AllowedOrigin *` разом з `PUT`                         | Середня      | Безпека / S3                 |
| 33  | `handleError` логує без `requestId`, контекст без `userId`            | Низька       | Observability                |
| 34  | Рівень логування не налаштовується (`LOG_LEVEL` немає)                | Низька       | Observability                |
| 35  | Немає readiness-перевірки (DB/Redis)                                  | Середня      | Observability / експлуатація |
| 36  | Немає CI для тестів застосунку і coverage                             | Середня      | Тести / CI                   |
| 37  | `vitest.config.ts` без `testTimeout`, таймаути під навантаженням      | Низька       | Тести                        |
| 38  | Playwright `webServer` використовує `npm` у pnpm-workspace            | Низька       | Тести / frontend             |

## Безпека

### 1. CSP ніде не застосовується

- **Що:** конфіг `src/config/csp.ts` ніхто не імпортує. Код встановлення CSP у `src/vendor/start/static-server.ts` закоментовано. `setSecurityHeaders` у `src/vendor/start/server.ts` додає `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` і HSTS, але `Content-Security-Policy` не додає.
- **Наслідок:** жодна відповідь (API, статика, HTML) не має CSP. Це finding M-5 зі `SECURITY_ANALYSIS.md`, закритий лише частково.
- **Пропозиція:** підключити `config/csp.ts` у `setSecurityHeaders` і в static handler; додати тест на наявність заголовка.

### 2. Немає rate limit на WebSocket upgrade і глобального per-IP ліміту

- **Що:** rate limiting є лише per-route для HTTP (`src/vendor/utils/rate-limit/*`), перевірка виконується до читання body. Upgrade-запит WebSocket ліміту не має. Глобального L1-ліміту за IP також немає. Лічильник зберігається в пам'яті процесу, а не в Redis.
- **Наслідок:** при кількох інстансах ліміт не спільний. Upgrade можна флудити. Це залишок finding C-2.
- **Пропозиція:** додати ліміт на `upgrade` за IP (`src/vendor/utils/rate-limit/ws-rate-limit.ts` або в `handleUpgrade`), розглянути Redis-лічильник для multi-instance.

### 3. WS-токен і `userToken` потрапляють у логи

- **Що:** `verifyUpgradeToken` логує WS-токен; `wsSessionHandler` логує `userToken`.
- **Наслідок:** секрети сесії потрапляють у логи та Sentry breadcrumbs.
- **Пропозиція:** прибрати значення з логів або маскувати (`abcd…`).

### 9. `broadcastToChannel` без runtime-перевірки каналу

- **Що:** `broadcastToChannel(channel: string, …)` приймає будь-який рядок, перевірка є лише на рівні типів. Finding L-4 зі `SECURITY_ANALYSIS.md` досі відкритий.
- **Пропозиція:** whitelist/шаблон допустимих каналів або перевірка формату перед publish.

## Конфігурація та запуск

### 4. `SERVE_STATIC=true` у `.env.example` ламає запуск

- **Що:** `.env.example` містить `SERVE_STATIC=true`. Тоді бекенд на старті сканує `packages/backend/public`, якого в репозиторії немає, і падає. Default у коді — `false` (`src/config/app.ts`).
- **Відтворення:** чистий клон → `cp .env.example .env` → `pnpm dev`, результат — `ENOENT: no such file or directory, scandir '.../packages/backend/public'`.
- **Пропозиція:** у `.env.example` поставити `SERVE_STATIC=false` або обробляти відсутність каталогу (warning замість падіння).

### 5. Fallback `PGSQL_PORT` не працює

- **Що:** у `src/config/database.ts` написано `Number(env["PGSQL_PORT"]) ?? 5432`. `Number(undefined)` повертає `NaN`, а не `null`/`undefined`, тому `??` ніколи не спрацьовує.
- **Наслідок:** без `PGSQL_PORT` застосунок отримує порт `NaN`.
- **Пропозиція:** `Number(env["PGSQL_PORT"] ?? 5432)` або парсинг з перевіркою.

### 6. Розбіжності `.env.example` з кодом

- **Є в `.env.example`, але код не читає (8):** `UNIX_PATH` (код читає `APP_UNIX_PATH`), `DATABASE_URL` (діють `PGSQL_*`), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `XAI_IMAGE_API_URL`, `XAI_IMAGE_EDIT_API_URL`, `XAI_IMAGE_MODEL`, `XAI_IMAGE_FORMAT`.
- **Код читає, але немає в `.env.example` (26):** `AI_TEXT_DRIVER`, `API_PATH_PREFIX`, `APP_MAX_BODY_SIZE`, `APP_MAX_JSON_BODY_SIZE`, `APP_MAX_MULTIPART_BODY_SIZE`, `APP_MAX_OCTET_BODY_SIZE`, `APP_UNIX_PATH`, по три змінні `CLIENT_ID`/`CLIENT_SECRET`/`REDIRECT_URI` для `GOOGLE_`, `FACEBOOK_`, `GITHUB_`, `GITLAB_` (12), `OAUTH_FRONTEND_SUCCESS_URL`, `OAUTH_FRONTEND_ERROR_URL`, `MISTRAL_API_KEY`, `MISTRAL_TEXT_MODEL`, `NODE_ENV`, `TURN_SECRET`, `TURN_HOST`.
- **Інше:** у `.env.example` `REDIS_PREFIX=promo_designer:`, а default у коді `uwebsocket:` — схоже на залишок з іншого проєкту.
- **Пропозиція:** синхронізувати `.env.example` з кодом; повний перелік із призначенням і default-значеннями є на сторінці `documentation/backend/configuration.md`.

### 7. Потрібен pgvector, ніде не задокументовано

- **Що:** `src/db/create-database.ts` виконує `CREATE EXTENSION IF NOT EXISTS vector`. На звичайному образі `postgres` команда `db:create` падає.
- **Пропозиція:** згадати pgvector у README (у документації вже є, образ `pgvector/pgvector:pg16`).

### 8. Різні PostgreSQL defaults у застосунку та скриптах

- **Що:** `drizzle.config.js` і `src/db/create-database.ts` мають defaults (`127.0.0.1`, `5432`, `postgres`, `itvibe_template`). `src/config/database.ts` defaults не має (див. також п. 5).
- **Наслідок:** міграції можуть піти в одну БД, а застосунок не стартувати або підключитися не туди.
- **Пропозиція:** один спільний модуль конфігурації БД для застосунку і скриптів.

## База даних і структура

### 10. `db:seed` — порожня заглушка

- **Що:** `src/db/seed.ts` містить лише `import "dotenv/config"`. Команда виконується успішно, але нічого не робить.
- **Пропозиція:** додати мінімальні seed-дані (тестовий користувач/адмін) або прибрати скрипт.

### 11. `src/drizzle/schema/index.ts` порожній

- **Що:** реальна схема лежить у `src/database/schema.ts` (на неї вказує `drizzle.config.js`), а `src/drizzle/schema/index.ts` порожній. Це вводить в оману.
- **Пропозиція:** видалити порожній файл або реекспортувати з нього схему.

Додатково (не баг): Relational Queries v2 (`src/database/relations.ts`) підключено, але жоден repository не використовує `db.query`. Транзакцій (`db.transaction`) у коді застосунку немає.

## HTTP

### 12. Тіло запиту читається лише для `post`/`put`

- **Що:** у `src/vendor/start/server.ts` `hasBody` істинний лише для `post` і `put`. Body `PATCH` і `DELETE` ніколи не читається.
- **Наслідок:** зараз `patch`-маршрутів немає, але новий `patch`-маршрут мовчки отримає порожній payload.
- **Пропозиція:** додати `patch` (і за потреби `del`) до методів з body або явно заборонити `patch` у `defineRoute`.

### 13. `sendResponse` при `payload === null`

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

## Що варто зробити далі

Пропоную оформити окремі записи в `feature_list.json` (через PR у `main`):

1. **security-hardening** — п. 1, 2, 3, 9, 18, 32.
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
