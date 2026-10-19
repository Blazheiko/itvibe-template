# Проблеми в коді, знайдені під час написання документації (feat-003)

Знайдено під час написання сторінок v1 (feat-003). Перевірено читанням коду та прогоном на чистому клоні.
Нічого з переліченого **не виправлено**: це поза обсягом feat-003 (документація без змін коду).
Кожен пункт — кандидат на окремий запис у `feature_list.json` або issue.

Шляхи відносно `packages/backend/`, якщо не вказано інше.

## Зведення

| #   | Проблема                                                              | Серйозність  | Область           |
| --- | --------------------------------------------------------------------- | ------------ | ----------------- |
| 1   | CSP ніде не застосовується                                            | Висока       | Безпека           |
| 2   | Немає rate limit на WebSocket upgrade і глобального per-IP ліміту     | Висока       | Безпека           |
| 3   | WS-токен і `userToken` потрапляють у логи                             | Середня      | Безпека           |
| 4   | `SERVE_STATIC=true` у `.env.example` ламає запуск                     | Середня      | DX / конфігурація |
| 5   | Fallback `PGSQL_PORT` не працює → `NaN`                               | Середня      | Конфігурація      |
| 6   | Розбіжності `.env.example` з кодом                                    | Середня      | Конфігурація      |
| 7   | Потрібен pgvector, ніде не задокументовано                            | Низька       | DX / БД           |
| 8   | Різні PostgreSQL defaults у застосунку та скриптах                    | Низька       | Конфігурація      |
| 9   | `broadcastToChannel` без runtime-перевірки каналу (L-4)               | Низька       | Безпека           |
| 10  | `db:seed` — порожня заглушка                                          | Низька       | DX / БД           |
| 11  | `src/drizzle/schema/index.ts` порожній                                | Низька       | Структура         |
| 12  | Тіло запиту читається лише для `post`/`put`                           | Низька       | HTTP              |
| 13  | `sendResponse` при `payload === null` віддає `String(status)` як JSON | Низька       | HTTP              |
| 14  | Прогалини плану body limits: тести, `.env.example`, playground        | Низька       | HTTP / тести      |
| 15  | Застарілі внутрішні документи                                         | Низька       | Документація      |
| 16  | Стиль коду бекенду не відповідає `AGENTS.md`                          | Інформаційна | Стиль             |

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

## Що варто зробити далі

Пропоную оформити окремі записи в `feature_list.json` (через PR у `main`):

1. **security-hardening** — п. 1, 2, 3, 9.
2. **env-example-sync** — п. 4, 5, 6, 8 (+ README).
3. **db-dx** — п. 7, 10, 11.
4. **http-body-fixes** — п. 12, 13, 14.
5. **internal-docs-cleanup** — п. 15 (видалити або оновити застарілі документи).
6. **format-baseline** — п. 16.
