# План: observability — логування та readiness (feat-030, F13)

Пункти 33, 34, 35 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Roadmap: [F13](./open-issues-roadmap.md); задачі: F13.1–F13.5 у [`open-issues-tasks.md`](./open-issues-tasks.md).

## Вихідний стан (`main` після PR #79)

- `vendor/utils/logger.ts`: `pino` без `level` (діє `info`), `LOG_LEVEL` немає.
- `handleError` у `server.ts` пише через глобальний `logger`; `requestId` створює `contextHandler` (`http-context.ts`) — **після** читання й валідації тіла, тож 413/415/422 і помилки читання тіла `requestId` не мають взагалі.
- Дочірній logger HTTP-контексту створюється до `session_web`, тому `userId` у ньому немає; WS-контекст має `userData.userId`, але в bindings його не кладе.
- `GET /api/ping` — статичний `{ status: "ok" }` (liveness). Readiness немає; `HEALTHCHECK` в образі (feat-019) б'є в `/api/ping`.

## Рішення

1. **`LOG_LEVEL`** (`fatal` | `error` | `warn` | `info` | `debug` | `trace` | `silent`, default `info`) у новому `config/logging.ts` з `configError`; невалідне значення — помилка `validateRuntimeConfig()` (logger сам падає на `info`, щоб старт міг повідомити про помилку).
2. **`requestId` з першого кроку:** `server.ts` генерує `requestId` на початку обробки запиту й передає його в `contextHandler` і в `handleError`. `handleError` пише через `logger.child({ requestId, userId, route, method })` — ті самі поля бачить і Sentry.
3. **`userId` у логах:** `session_web` після відновлення сесії замінює `context.logger` дочірнім з `userId`; WS-контекст додає `userId` у bindings, коли він є.
4. **`GET /<prefix>/ready`:** `readinessService.check()` — `SELECT 1` через репозиторій (`health-repository.ts`, бо сервісам заборонено імпортувати `#database/db.js`) і `PING` основного Redis, кожна перевірка з таймаутом `READINESS_CHECK_TIMEOUT_MS` (default 1000). Відповідь `200 { status: "ok" }` або `503 { status: "unavailable" }` без деталей; яка залежність упала — лише в `warn`. Маршрут без сесії й CSRF; глобальний L1-ліміт за IP лишається (частота healthcheck на порядки нижча за поріг) — відступ від roadmap, де пропонувалося виключити L1.
5. **`HEALTHCHECK`** в образі → `/api/ready` з тією ж перевіркою тіла (`"status":"ok"`).

## Кроки

| Крок | Зміст                                                                   | Задача |
| ---- | ----------------------------------------------------------------------- | ------ |
| 1    | `LOG_LEVEL`                                                             | F13.1  |
| 2    | `requestId` з початку запиту, `handleError` через child logger          | F13.2  |
| 3    | `userId` у HTTP- і WS-логах                                             | F13.3  |
| 4    | `GET /ready`                                                            | F13.4  |
| 5    | `HEALTHCHECK` на `/ready`                                               | F13.5  |
| 6    | `observability.md`, `deployment.md`, `configuration.md`, `.env.example` | F13.D  |

## Ризики

- **`HEALTHCHECK` на readiness:** при недоступній БД контейнер стає `unhealthy`. Docker сам контейнер не перезапускає, але оркестратор, що реагує на `unhealthy`, може — це свідомий вибір: інстанс без БД не має отримувати трафік.
