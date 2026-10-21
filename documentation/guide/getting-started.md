# Швидкий старт

Ця сторінка проводить від чистого клону до запущених backend і frontend на локальній машині. Кожен крок перевірено на чистому клоні репозиторію.

## Передумови

| Інструмент | Версія                               | Джерело                                                                                                                                                                 |
| ---------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js    | `24.20.0` (вимога `^24.15.0`)        | [.nvmrc](https://github.com/Blazheiko/itvibe-template/blob/main/.nvmrc), [package.json](https://github.com/Blazheiko/itvibe-template/blob/main/package.json)            |
| pnpm       | `>=9.0.0`, зафіксовано `pnpm@9.15.0` | [package.json](https://github.com/Blazheiko/itvibe-template/blob/main/package.json) (`engines`, `packageManager`)                                                       |
| PostgreSQL | з розширенням **pgvector**           | [create-database.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/db/create-database.ts) виконує `CREATE EXTENSION IF NOT EXISTS vector` |
| Redis      | будь-яка сучасна версія              | [config/redis.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/config/redis.ts)                                                          |

Структуру репозиторію описано в розділі [Структура проєкту](/guide/project-structure).

### PostgreSQL і Redis через Docker

Звичайний образ `postgres` не містить pgvector, тому `db:create` на ньому впаде. Використовуйте образ `pgvector/pgvector`:

```bash
docker run -d --name itvibe-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=<your-pg-password> \
  -p 5432:5432 pgvector/pgvector:pg16

docker run -d --name itvibe-redis \
  -p 6379:6379 redis:7 redis-server --requirepass <your-redis-password>
```

## 1. Клонування та встановлення залежностей

```bash
git clone https://github.com/Blazheiko/itvibe-template.git
cd itvibe-template
nvm use          # бере версію з .nvmrc
pnpm install
```

## 2. Файл `.env` для backend

```bash
cp packages/backend/.env.example packages/backend/.env
```

Для локальної розробки змініть у `packages/backend/.env` такі змінні:

```dotenv
APP_KEY=<random-string-at-least-32-chars>

PGSQL_HOST=127.0.0.1
PGSQL_PORT=5432
PGSQL_USER=postgres
PGSQL_PASSWORD=<your-pg-password>
PGSQL_DB_NAME=itvibe_template

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>

# у репозиторії немає каталогу packages/backend/public
SERVE_STATIC=false
```

Пояснення:

- **База даних** читається лише зі змінних `PGSQL_*` ([config/database.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/config/database.ts)); ті самі значення бере drizzle-kit ([`drizzle.config.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/drizzle.config.ts)). Незадані змінні отримують defaults `127.0.0.1:5432`, `postgres`, база `itvibe_template`.
- **Redis**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_PREFIX` ([config/redis.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/config/redis.ts)). Якщо Redis запущено без пароля, залиште `REDIS_PASSWORD` порожнім.
- **`SERVE_STATIC`**: у `.env.example` стоїть `false`, бо в dev фронтенд віддає Vite. `true` потрібне лише тоді, коли в `packages/backend/public` лежить зібраний фронтенд; без цього каталогу сервер пише попередження і стартує без статики.
- **`APP_KEY`** потрібен для хешування OTP, коли ввімкнено phone-auth (мінімум 32 символи, див. [validate-runtime-config.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/start/validate-runtime-config.ts)). Із `AUTH_PHONE_ENABLED=false` сервер стартує і без нього, але краще задати його одразу.

Повний перелік змінних з defaults наведено на сторінці [Конфігурація](/backend/configuration).

## 3. База даних

Команди запускаються з workspace backend:

```bash
pnpm --filter backend db:create    # створює БД і розширення vector
pnpm --filter backend db:migrate   # drizzle-kit migrate
pnpm --filter backend db:seed      # див. примітку нижче
```

Очікуваний вивід:

```text
Database "itvibe_template" created successfully.
Extension "vector" ensured in database "itvibe_template".
...
[✓] migrations applied successfully!
```

`db:create` можна запускати повторно: для наявної БД він виводить `Database "itvibe_template" already exists.`

::: info Seed
Зараз [src/db/seed.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/db/seed.ts) містить тільки `import "dotenv/config"` і жодних даних не вставляє. Команда завершується без помилок, але нічого не робить.
:::

Детальніше про схему та міграції: [База даних](/backend/database).

## 4. Запуск

```bash
pnpm dev
```

Скрипт збирає `shared` і `backend`, а потім паралельно запускає dev-сервери backend і frontend ([package.json](https://github.com/Blazheiko/itvibe-template/blob/main/package.json)). Після старту:

| Сервіс                     | URL                                                                     | Джерело                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Backend (HTTP + WebSocket) | `http://localhost:3000` (`PORT`, `HOST=0.0.0.0`)                        | [config/app.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/config/app.ts) |
| Frontend (Vite)            | `http://localhost:5173`; `/api` і `/ws` проксюються на `127.0.0.1:3000` | [vite.config.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/vite.config.ts)  |

У лозі backend має з'явитися рядок `Listening http://0.0.0.0:3000`, а у Vite рядок `Local: http://localhost:5173/`.

Пакети можна запускати й окремо: `pnpm dev:backend` / `pnpm dev:frontend` (див. [Скрипти](/reference/scripts)).

## 5. Перевірка health

Маршрут `GET /ping` оголошено в [http-routes.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/routes/http-routes.ts). HTTP-маршрути мають префікс `API_PATH_PREFIX`, за замовчуванням `api`:

```bash
curl -i http://127.0.0.1:3000/api/ping
```

```text
HTTP/1.1 200 OK
content-type: application/json
...
{"status":"ok"}
```

Через Vite-проксі той самий запит працює на `http://localhost:5173/api/ping`.

## Усунення проблем

| Симптом                                                           | Причина та рішення                                                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ENOENT ... scandir '.../packages/backend/public'` під час старту | Увімкнено `SERVE_STATIC=true`. Встановіть `SERVE_STATIC=false` або створіть каталог `packages/backend/public`.                           |
| `db:create` падає на `CREATE EXTENSION ... vector`                | У PostgreSQL немає pgvector. Візьміть образ `pgvector/pgvector` або встановіть розширення.                                               |
| `ECONNREFUSED` / помилка автентифікації під час `db:*`            | Перевірте `PGSQL_HOST`, `PGSQL_PORT`, `PGSQL_USER`, `PGSQL_PASSWORD`.                                                                    |
| Помилки Redis (`NOAUTH`, `ECONNREFUSED`)                          | `REDIS_PASSWORD` і `REDIS_PORT` мають збігатися з налаштуваннями сервера Redis.                                                          |
| `bind: address already in use` для 5432/6379/3000/5173            | Порт уже зайнятий. Звільніть його або змініть порт (`-p <host-port>:5432` у Docker плюс відповідна змінна в `.env`, `PORT` для backend). |
| `pnpm install` скаржиться на engines                              | Перемкніться на Node із `.nvmrc` (`nvm use`) і pnpm `>=9`.                                                                               |
| Phone-auth не стартує через OTP-секрет                            | Задайте `APP_KEY` або `AUTH_OTP_HMAC_KEY` довжиною від 32 символів.                                                                      |

Далі: [Огляд backend](/backend/).
