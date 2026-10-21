# База даних

Бекенд працює з PostgreSQL через Drizzle ORM. Пакети `drizzle-orm` і `drizzle-kit` закріплені на релізі-кандидаті `1.0.0-rc.4` у [`packages/backend/package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/package.json); оновлювати їх слід разом і на ту саму точну версію. Драйвер — `pg` (`node-postgres`). Redis використовується окремо — як сховище сесій та для тротлінгу.

## Підключення

Параметри беруться з env-змінних `PGSQL_*` (див. [`.env.example`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/.env.example) та [Конфігурацію](/backend/configuration)):

| Змінна           | Приклад у `.env.example` |
| ---------------- | ------------------------ |
| `PGSQL_HOST`     | `127.0.0.1`              |
| `PGSQL_PORT`     | `5432`                   |
| `PGSQL_USER`     | `postgres`               |
| `PGSQL_PASSWORD` | `postgres`               |
| `PGSQL_DB_NAME`  | `itvibe_template`        |

Runtime-конфіг — [`src/config/database.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/config/database.ts); пул і клієнт Drizzle створюються в [`src/database/db.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/database/db.ts):

```ts
const pool = new pg.Pool({
    /* host, port, ... */ max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: false,
})

const db = drizzle({
    client: pool,
    relations,
    logger: appConfig.env === 'prod' || appConfig.env === 'production' ? false : true,
})
```

SQL-логування вмикається для всіх середовищ, крім `prod`/`production`.

Для `drizzle-kit` є окремий [`drizzle.config.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/drizzle.config.ts): він бере підключення з тієї ж `resolveDatabaseConfig()`, що й застосунок, `schema: "./src/database/schema.ts"`, `out: "./src/drizzle/migrations"`, таблиця журналу `drizzle.__drizzle_migrations`, `strict: true`.

## Схема та relations

Таблиці описано в одному файлі [`src/database/schema.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/database/schema.ts) (`pgTable`, `pgEnum`, індекси, `customType`), наприклад `export const users = pgTable('users', { ... })`. Каталог `src/drizzle/schema/` містить лише порожній `index.ts` — справжня схема саме в `src/database`.

Зв'язки задаються через Relational Queries v2 у [`src/database/relations.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/database/relations.ts):

```ts
export const relations = defineRelations(schema, (r) => ({
    users: {
        oauthAccounts: r.many.oauthAccounts({ from: r.users.id, to: r.oauthAccounts.userId }),
        // ...
    },
}))
```

Об'єкт `relations` передається в `drizzle({ relations })`, тож `db.query.<table>.findMany/findFirst` з `with` доступні. Однак наразі репозиторії їх не використовують — запити пишуться core query builder-ом, як у [`user-repository.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/repositories/user/user-repository.ts):

```ts
async findById(id) {
  return await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then((rows) => rows.at(0));
},
```

Типи рядків виводяться через `InferSelectModel<typeof users>` / `InferInsertModel<typeof users>`. Транзакцій (`db.transaction`) у коді застосунку зараз немає.

## Міграції

Міграції лежать у [`src/drizzle/migrations`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/drizzle/migrations) у форматі Drizzle 1.0 «тека на міграцію»: кожна тека `<timestamp>_<name>` містить `migration.sql` і `snapshot.json`. Зараз є одна — `20261017193054_init`.

## Скрипти

Запускаються в пакеті backend (`pnpm --filter ./packages/backend <script>`):

| Скрипт           | Команда                           | Що робить                                                                                                                                                                                                                            |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `db:create`      | `tsx src/db/create-database.ts`   | підключається до БД `postgres`, створює `PGSQL_DB_NAME`, якщо її немає, і виконує `CREATE EXTENSION IF NOT EXISTS vector` ([код](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/db/create-database.ts)) |
| `db:create:prod` | `node dist/db/create-database.js` | те саме зі зібраного коду                                                                                                                                                                                                            |
| `db:generate`    | `drizzle-kit generate`            | генерує нову теку міграції з різниці між схемою та snapshot                                                                                                                                                                          |
| `db:migrate`     | `drizzle-kit migrate`             | застосовує невиконані міграції                                                                                                                                                                                                       |
| `db:studio`      | `drizzle-kit studio`              | веб-інтерфейс Drizzle Studio                                                                                                                                                                                                         |
| `db:seed`        | `tsx src/db/seed.ts`              | ідемпотентно вставляє початкові промпти, з `--demo` — ще й demo-акаунти, див. [Seed](#seed) ([код](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/db/seed.ts))                                          |
| `db:seed:prod`   | `node dist/db/seed.js`            | те саме зі зібраного коду                                                                                                                                                                                                            |

## Seed

`db:seed` можна запускати повторно: наявні рядки він пропускає й нічого не перезаписує. Усе виконується в одній транзакції, тож при помилці в БД не залишається нічого, а команда завершується з кодом 1. Логіка — у [`src/db/seed/run-seed.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/db/seed/run-seed.ts).

| Що                                                                                                  | Коли            | Повторний запуск                                                                        |
| --------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------- |
| Промпти `SUPPORT_SYSTEM`, `SUPPORT_FIRST_CHAT`, `SUPPORT_QUERY_TRANSLATION` у `llm_system_prompts`  | завжди          | `ON CONFLICT (type) DO NOTHING`: промпти, відредаговані в адмінці, лишаються як є       |
| Адмін (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) і, опційно, звичайний користувач (`SEED_USER_*`) | лише з `--demo` | наявний користувач (пошук за `LOWER(email)`) пропускається; пароль і роль не змінюються |

- Тексти промптів беруться з тих самих defaults, що й runtime-fallback сервісів ([`config/support.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/config/support.ts)), тому перший seed не змінює поведінку AI. Без рядків у таблиці AI працює на цих fallback, але адмінка не може змінити промпт: `UPDATE` не створює відсутній рядок.
- Від `APP_ENV` seed не залежить: без `--demo` акаунти не створюються в жодному середовищі. З `--demo` у production-like середовищі виводиться попередження.
- Email нормалізується (`trim().toLowerCase()`), пароль хешується `hashPassword` з `metautil`, `email_verified_at` = поточний час.
- Якщо `SEED_ADMIN_EMAIL` уже належить користувачу з `role = 'user'`, seed завершується успішно з попередженням `exists_without_admin_role`: роль автоматично не підвищується.
- Звіт виводить для кожного запису `inserted` або `skipped (<причина>)`: `already_exists`, `exists_without_admin_role`, `missing_credentials`, `demo_disabled`.

::: warning Кеш промптів
Backend читає промпти один раз на старті (`promptService.load()` у [`src/index.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/index.ts)). Запускайте `db:seed` до старту backend або перезапустіть його після seed.
:::

### Перший адмін у production

Demo-сценарій для production не призначений. Варіанти:

1. Зареєструватися звичайним способом і підвищити роль вручну:

    ```sql
    UPDATE users SET role = 'admin' WHERE LOWER(email) = '<admin-email>';
    ```

2. Разово виконати `pnpm db:seed:prod --demo` з тимчасово заданими `SEED_ADMIN_EMAIL` і `SEED_ADMIN_PASSWORD`, а потім одразу прибрати їх з оточення.

## Як змінити схему

```mermaid
flowchart LR
  A[Редагувати schema.ts] --> B[Оновити relations.ts]
  B --> C[pnpm db:generate]
  C --> D[Переглянути migration.sql]
  D --> E[pnpm db:migrate]
  E --> F[Репозиторій + тести]
```

1. Змініть таблиці в `src/database/schema.ts`; для нових зв'язків — `relations.ts`.
2. `db:generate` створить нову теку в `src/drizzle/migrations`; перевірте SQL вручну.
3. `db:migrate` застосує її до локальної БД.
4. Додайте методи у відповідний репозиторій (див. [Архітектуру](/backend/architecture) і [Додавання фічі](/backend/adding-a-feature)).

## Redis

Клієнт `ioredis` створюється в [`src/database/redis.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/database/redis.ts) з конфігу `#config/redis.js` (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_PREFIX`). Його використовують сховище сесій ([`redis-session-storage.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/session/redis-session-storage.ts)), WS-автентифікація, скидання пароля та тротлінг автентифікації. Докладніше — [Автентифікація та безпека](/backend/auth-security).

Клієнт відмовляє швидко, а не зависає: без offline queue і повторів, з таймаутом команди `REDIS_COMMAND_TIMEOUT_MS` (500 мс); коли Redis недоступний, запити отримують `503 service_unavailable`. Контракт і обмеження — [Відмова Redis](/backend/auth-security#відмова-redis).
