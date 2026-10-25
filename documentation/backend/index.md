# Огляд бекенду

::: tip Вперше тут?
Ця сторінка — технічний огляд. Якщо ви тільки знайомитеся з шаблоном, почніть з [Як влаштований бекенд](/guide/how-backend-works): там простими словами пояснено шлях запиту і навіщо потрібні шари.
:::

Пакет `backend` ([packages/backend](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend)) — HTTP- та WebSocket-сервер на TypeScript (ES modules), побудований на uWebSockets.js. Точка входу — [src/index.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/index.ts); у розробці він запускається через `tsx watch`, у продакшені — як `node dist/index.js` (див. [Скрипти](/reference/scripts)).

## Стек

За залежностями з [packages/backend/package.json](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/package.json):

| Призначення           | Залежності                                                    |
| --------------------- | ------------------------------------------------------------- |
| HTTP/WebSocket-сервер | `uWebSockets.js` (`v20.56.0` з GitHub), `ws`                  |
| БД                    | `drizzle-orm` / `drizzle-kit` `1.0.0-rc.4`, `pg` (PostgreSQL) |
| Валідація             | `@arktype/type`                                               |
| Redis                 | `ioredis`                                                     |
| Моніторинг і логи     | `@sentry/node`, `pino`, `pino-pretty`                         |
| Файлове сховище       | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`         |
| Пошта                 | `nodemailer`                                                  |
| Push-сповіщення       | `web-push`                                                    |
| AI                    | `ai`, `@ai-sdk/xai`, `openai`, `@mistralai/mistralai`         |
| OAuth                 | `arctic`                                                      |
| Утиліти               | `better-result`, `dotenv`, `luxon`, `metautil`, `nanoid`      |
| Контракти             | `shared` (`workspace:*`)                                      |

Тести — Vitest, збірка — `tsc --build` з посиланням на `../shared` ([tsconfig.json](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/tsconfig.json)).

## Структура `src`

| Каталог                                                                                          | Вміст                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [app](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app)           | Логіка застосунку: `controllers` (http, ws), `middlewares`, `repositories`, `transformers`, `services`, `routes` (`http-routes.ts`, `ws-routes.ts`), `routing` (`define-route.ts`, `define-ws-route.ts`), `start`, `state`, `validate`, `websocket` |
| [config](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/config)     | Модулі конфігурації: `app`, `auth`, `cookies`, `cors`, `csp`, `csrf`, `database`, `redis`, `session`, `mail`, `disk`, `push`, `ai`, `oauth`, `sentry` та ін.                                                                                        |
| [vendor](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor)     | Інфраструктурне ядро: `start/` (`server.ts`, `router.ts`, `static-server.ts`), `utils/` (logger, session, rate-limit, storage, validation…), `contracts/`, `types/`                                                                                 |
| [database](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/database) | Підключення (`db.ts`, `redis.ts`), схема (`schema.ts`) і relations (`relations.ts`)                                                                                                                                                                 |
| [db](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/db)             | Скрипти `create-database.ts` і `seed.ts`                                                                                                                                                                                                            |
| [drizzle](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/drizzle)   | Міграції (`migrations/`), таблиці (`schema/`), типи й guards                                                                                                                                                                                        |
| [openapi](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/openapi)   | Невикористані заготовки під OpenAPI (`spec.ts` порожній)                                                                                                                                                                                            |
| [scripts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/scripts)   | Службові скрипти, зокрема `send-test-email.ts`                                                                                                                                                                                                      |

Модулі імпортуються через аліаси `#app/*`, `#config/*`, `#vendor/*`, `#database/*`, `#drizzle/*` та `#logger` — див. [Структура проєкту](/guide/project-structure).

Бізнес-логіка розкладена шарами `repository → transformer → service → controller → route`, а контракти запитів/відповідей описуються в `shared` ([README.md](https://github.com/Blazheiko/itvibe-template/blob/main/README.md)).

## Куди далі

- [Архітектура](/backend/architecture)
- [Життєвий цикл запиту](/backend/request-lifecycle)
- [Конфігурація](/backend/configuration)
- [Маршрутизація та middlewares](/backend/routing-middlewares)
- [База даних](/backend/database)
- [Автентифікація та безпека](/backend/auth-security)
- [Додавання фічі](/backend/adding-a-feature)
