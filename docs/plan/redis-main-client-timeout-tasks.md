# Task list: основний Redis-клієнт — швидка відмова замість зависання (пункт 70)

> **Статус:** виконано у feat-016 (PR #37, merge `17ea622`, 2026-10-21). Чекбокси нижче не відмічено заднім числом: evidence — у `feature_list.json` (feat-016).

Джерело: [redis-main-client-timeout-plan.md](./redis-main-client-timeout-plan.md) (редакція 5). Редакція task list 2: задача T4.2 для `503` через сервісний шар (`tryInternal`), виправлені залежності T8, резервний сигнал у T8.1, посилені AC здоров'я, обсяг фронтенду без нового UI, фінальна перевірка T10.1.
Кожна задача атомарна (≤ 0.5 дня), з критерієм приймання (**AC**). Порядок послідовний, якщо не вказано інше; `→` — залежність. Після кожної задачі: `pnpm typecheck`, `pnpm lint`, `pnpm --filter backend test` зелені (зміна контракту і всі її викликачі — в одній задачі).

---

## Етап 0 — Підготовка

- [ ] **T0.1** PR у `main`: запис `feat-016` у `feature_list.json` (`owner`, `branch: feat/redis-main-client-timeout`, `status: in_progress`, посилання на план і цей task list); у тому ж PR план і task list.
      **AC:** PR злито, рядок `in_progress`.
- [ ] **T0.2** → T0.1. Гілка `feat/redis-main-client-timeout` від свіжого `main`; `progress.md` для feat-016; `./init.sh`.
      **AC:** `init.sh` зелений, `progress.md` закомічено.
- [ ] **T0.3** Вимірювання p99 операцій сесії (`GETEX`, `SETEX`) на локальному Redis (за зразком feat-013, етап 9); результат — у план, остаточний default `REDIS_COMMAND_TIMEOUT_MS`.
      **AC:** p50/p99/max записано в плані; default підтверджено або змінено.

## Етап 1 — Конфіг і клієнт (розділ 1)

- [ ] **T1.1** `config/redis.ts`: `REDIS_COMMAND_TIMEOUT_MS` (default з T0.3, ціле ≥ 1) і `REDIS_LOGOUT_ALL_DEADLINE_MS` (default `2000`, ціле ≥ 1) з помилками конфігу; перевірка в `validateRuntimeConfig()`.
      **AC:** невалідні значення зупиняють старт; defaults застосовуються (тест конфігу).
- [ ] **T1.2** → T1.1. `database/redis.ts`: `enableOfflineQueue: false`, `autoResendUnfulfilledCommands: false`, `maxRetriesPerRequest: 0`, `commandTimeout`, `retryStrategy: min(times · 100, 2000)`. Обробник `error` тимчасово — обмежений `logger.warn` (у T2.2 його замінить модуль здоров'я).
      **AC:** unit-тест перевіряє передані в ioredis опції (мок конструктора); `Unhandled error event` більше не друкується.

## Етап 2 — Класифікація, здоров'я, Sentry (розділи 2–3)

- [ ] **T2.1** `vendor/utils/network/errors/redis-unavailable-error.ts` (`statusCode 503`, `code service_unavailable`) і `isRedisUnavailable(err)`.
      **AC:** unit: `Command timed out`, `Connection is closed`, `Stream isn't writeable…`, `MaxRetriesPerRequestError`, `ECONNREFUSED`, `ECONNRESET` → `true`; `WRONGTYPE`, помилка Lua, `SyntaxError` → `false`.
- [ ] **T2.2** → T1.2, T2.1. `database/redis-health.ts`: стан `healthy | unavailable`; перехід у `unavailable` (подія `error`/`close` або `markUnavailable()`) → **одна** `logger.error({ sentryCapture: true }, "Redis unavailable")`; повтори — `warn` не частіше разу на хвилину; відновлення за успішною командою (`markHealthy()`), фоновим `PING` раз на 2 с у стані `unavailable` або подією `ready` → `logger.info("Redis recovered", { downMs })`. Обробник `error` з T1.2 переходить сюди.
      **AC:** unit (фейковий час, мок клієнта): серія помилок — одна `logger.error`; повторні `warn` — не частіше одного за 60 с (61-ша секунда — другий `warn`, 59-та — ні); `PING` викликається рівно раз на 2 с лише в стані `unavailable` і не викликається в `healthy`; кожен із трьох сигналів (успішна команда, `PING`, `ready`) відновлює стан і зупиняє таймер; новий інцидент — нова подія; shutdown зупиняє таймер.
- [ ] **T2.3** → T2.1, T2.2. `withRedis(op)`: `status !== "ready"` → `RedisUnavailableError` без виклику `op` і `markUnavailable()`; помилка недоступності → загорнута + `markUnavailable()`; успіх → `markHealthy()`; інша помилка → пробрасується.
      **AC:** unit на кожну гілку.
- [ ] **T2.4** → T2.1. `sentryStream` у `logger.ts`: пропуск записів з `err.type === "RedisUnavailableError"`.
      **AC:** unit (`__loggerTestHooks.sentryStream`): такий запис не викликає `captureException`; інші `error` — як зараз; подія модуля здоров'я (`sentryCapture`, без `err`) проходить.
- [ ] **T2.5** → T2.2. Зупинка таймера здоров'я в `stopGracefully` (`src/index.ts`).
      **AC:** після shutdown таймерів не лишається (тест або перевірка `unref` + явне очищення).

## Етап 3 — Шар сесій і `logoutAll` (розділи 1, 4)

- [ ] **T3.1** → T2.3. `redis-session-storage.ts`: `getSession`, `saveSession`, `updateSessionData`, `changeSessionData`, `destroySession` через `withRedis`; коментар про ідемпотентність і відсутність повторів.
      **AC:** unit: помилка недоступності → `RedisUnavailableError`; `updateSessionData` — порядок `getSession` → `saveSession`, при недоступному читанні запису немає.
- [ ] **T3.2** → T1.1, T2.3. `destroyAllSessions`: дедлайн `REDIS_LOGOUT_ALL_DEADLINE_MS` із залишком бюджету на кожному `await` (`min(remaining, REDIS_COMMAND_TIMEOUT_MS)`, власний таймер); успіх лише при курсорі `0`; інакше `RedisUnavailableError`; `logger.warn` з `userId` і кількістю видалених на момент зупинки. Викликачі (`logoutAll` у `session-handler.ts`, `auth-service`, `password-reset-service`) — у тій самій задачі.
      **AC:** unit (фейковий час): повний `SCAN` → успіх із `deletedCount`; недоступність посеред циклу → помилка без `deletedCount`; команда починається за 10 мс до дедлайну і «висить» → відмова не пізніше `deadline` + ε; повторний виклик дочищає решту.
- [ ] **T3.3** → T2.3. `generate-ws-token-service.ts` і `ws-session-auth.ts` (`refreshToken`, `revokeToken`) через `withRedis`.
      **AC:** unit: недоступність → `RedisUnavailableError`.

## Етап 4 — HTTP (розділ 4)

- [ ] **T4.1** → T2.1. `handleError`: `RedisUnavailableError` → `503 service_unavailable`, `Retry-After: 1`, тіло без тексту ioredis (і в `APP_ENV=local`).
      **AC:** unit: статус, заголовок, тіло; `logger.error` викликається з `err` типу `RedisUnavailableError` (Sentry його пропустить за T2.4).
- [ ] **T4.2** → T2.1, T4.1. `503` через сервісний шар: новий тег `AppError` `ServiceUnavailable` (`503`, `code service_unavailable`) у `services/shared/errors.ts`; `toInternalError` / `tryInternal` (`result-helpers.ts`) повертають його, коли `cause instanceof RedisUnavailableError`, замість `Internal`; `mapControllerError` / `sendErrorResponse` додають `Retry-After: 1` і не пишуть технічного тексту. Інші причини (зокрема помилки окремого rate-limit клієнта в `consumeAuthThrottle`) — без змін, як зараз.
      **AC:** unit для **login**, **генерації WS-токена** (init / login), **logout** і **logoutAll**: збій Redis усередині сервісу (мок `withRedis`-шару кидає `RedisUnavailableError`) → відповідь контролера `503 service_unavailable`, `Retry-After: 1`, без тексту ioredis і без `publicMessage` на кшталт «Failed to log in user»; ті самі операції з іншою помилкою → `500` як зараз.
- [ ] **T4.3** → T3.2, T4.2. `logoutAll` у контролері: успіх лише з повним видаленням; `RedisUnavailableError` → `503` без `deletedCount`.
      **AC:** unit контролера/сервісу: часткове видалення не дає `status: "success"`.

## Етап 5 — WebSocket-повідомлення (розділ 4)

- [ ] **T5.1** → T3.3. `onMessage`: `ping` обробляється **першим** — `pong` без жодної Redis-команди; refresh токена для `ping` — після `pong`, без `await` перед ним; недоступність refresh — без логу.
      **AC:** unit: при «висячому» refresh `pong` надіслано одразу; refresh викликано після `pong`; з'єднання не закривається; при refresh, що кидає `RedisUnavailableError`, **жодного** виклику `logger.error`/`logger.warn` з `onMessage` (інша помилка refresh — лог як зараз).
- [ ] **T5.2** → T3.1. `wsSessionHandler` → `{ kind: "ok", session } | { kind: "missing" } | { kind: "unavailable" }`; оновити всіх викликачів (`onMessage`) у тій самій задачі.
      **AC:** unit: сесії немає → `missing`; `RedisUnavailableError` → `unavailable`; інша помилка → як зараз.
- [ ] **T5.3** → T5.1, T5.2. `onMessage` для прикладних повідомлень: refresh недоступний або сесія `unavailable` → відповідь `{ status: "error", event: <початковий event>, error: { code: "service_unavailable", … }, data: null, timestamp }` (за зразком `createWsRateLimitErrorResponse`), сесія після недоступного refresh не читається, з'єднання не закривається, `logger.error` не викликається; `missing` → `closeExpiredSession` як зараз.
      **AC:** unit на обидві гілки й на «друга команда не виконується».

## Етап 6 — WebSocket upgrade (розділ 4)

- [ ] **T6.1** → T2.3. `verifyUpgradeToken` → `ok | missing | unavailable`; після першої недоступної команди друга (`get` сесії) не виконується. Оновити хук `onUpgrade` і `handleUpgrade` у тій самій задачі: `unavailable` → `503` з `Retry-After: 1` (через `res.cork`) до `res.upgrade`; abort під час `await` → жодного запису.
      **AC:** unit: `unavailable` → `503`, без `4001`; одна Redis-команда; abort → жодного виклику `res.*`; `missing` → поведінка як зараз (пункт 18 не змінюється).

## Етап 7 — Фронтенд

- [ ] **T7.1** `useWebSocketConnection.ts` (`messageHandler`): відповідь з `status: "error"`, `code: "service_unavailable"` і відомим `event` відхиляє відповідний Promise одразу й не викликає перепідключення.
      **AC:** unit-тест композабла.
- [ ] **T7.2** HTTP-клієнт: `503` показує загальну помилку сервера (наявний шлях `getResponseMessage` / `errorServer`). Метод `api.logoutAll` (`utils/api.ts`) при `503` повертає помилку, а не успіх. **Екрана «вийти з усіх пристроїв» у фронтенді немає** (є лише метод API) — створення UI в задачу не входить; повідомлення «повторіть» реалізується, коли з'явиться екран.
      **AC:** unit для `api.logoutAll` з відповіддю `503` → помилка; `pnpm --filter frontend test` зелений.

## Етап 8 — Інтеграційні тести і CI (розділ «Тести»)

- [ ] **T8.1** Хелпер для тестів: `waitForPostponed(admin, clientId, cmd)` — опитує `CLIENT LIST ID`, доки `flags` містить `b` і `cmd` збігається (основний сигнал зі spike); якщо версія Redis не дає `b` — резервний сигнал: `blocked_clients` в `INFO clients` зріс відносно значення до операції **і** `cmd` клієнта збігається. Падає з явним повідомленням після межі часу. Перевірити на `redis:7-alpine` у CI.
      **AC:** тест хелпера зелений локально і в `redis-tests.yml`; окремий тест резервної гілки (основний сигнал примусово вимкнено параметром) теж зелений.
- [ ] **T8.2** → T3.1, T8.1. Повтору немає — запис і logout (`saveSession`, `destroySession`): `PAUSE WRITE` → операція → `waitForPostponed` → `CLIENT KILL` → `UNPAUSE` → reconnect → ключа немає / сесія лишається. Контрольний прогін з повною конфігурацією повторів (`enableOfflineQueue: true`, `autoResendUnfulfilledCommands: true`, `maxRetriesPerRequest: null`, довгий `commandTimeout`) **падає**.
      **AC:** основний прогін зелений; контроль червоний (перевірено вручну, зафіксовано в evidence).
- [ ] **T8.3** → T3.1, T8.1. Застарілий знімок на рівні `saveSession`: ключ `V0`, `saveSession(A)` відкладено й убито → після reconnect `V0`; `saveSession(B)` → `B`.
      **AC:** тест зелений.
- [ ] **T8.4** → T3.1. Пізнє виконання задокументоване: `PAUSE WRITE`, `saveSession` → таймаут, `UNPAUSE` без розриву → ключ з'являється.
      **AC:** тест зелений (фіксує визнану поведінку).
- [ ] **T8.5** → T2.3, T3.1. Здоров'я без reconnect: пауза → таймаут, `unavailable`, одна подія; `UNPAUSE` → успішна команда або фоновий `PING` → `healthy`, `recovered`; новий збій — нова подія.
      **AC:** тест зелений.
- [ ] **T8.6** → T3.1. Розірване з'єднання: команда відхиляється одразу (без очікування таймауту); клієнт перепідключається сам; операція під `CLIENT PAUSE WRITE` падає за ≈ `REDIS_COMMAND_TIMEOUT_MS` як `RedisUnavailableError`.
      **AC:** тест зелений; `redis-tests.yml` проходить на PR.

## Етап 9 — Конфіг і документація

- [ ] **T9.1** `.env.example`: `REDIS_COMMAND_TIMEOUT_MS`, `REDIS_LOGOUT_ALL_DEADLINE_MS` з коментарями.
      **AC:** звірка змінних коду з `.env.example` (як у feat-006).
- [ ] **T9.2** Документація: `configuration.md` (нові змінні); `request-lifecycle.md` (`503 service_unavailable`); `observability.md` (одна подія на інцидент, пропуск у Sentry, stdout-логи як свідоме рішення, `Redis recovered`); `websocket.md` (heartbeat незалежний від Redis, `service_unavailable` з `event`, `503` на upgrade); таблиця відмови Redis в `auth-security.md` (заміна «чекає ~45 с»); контракт `logoutAll`; пункт 70 у code-issues.
      **AC:** `pnpm docs:build && pnpm docs:verify` зелені.

## Етап 10 — Перевірка і реліз

- [ ] **T10.1** Ручна перевірка (два процеси бекенду, окремий `redis-server`, як у feat-013): зупинка Redis > 20 с — WS живуть (heartbeat триває), прикладні WS-запити отримують `service_unavailable` з тим самим `event`, HTTP — `503` за мілісекунди, новий upgrade — `503`, у логах одна `Redis unavailable` на процес; повернення Redis — `Redis recovered`, без рестарту все працює, сесії на місці; `logoutAll` під час збою — `503`, після — успіх.
      **AC:** команди й вивід у `progress.md`.
- [ ] **T10.2** → T10.1. Фінальна перевірка поточного стану гілки (не покладатися на перевірки окремих задач):
      `pnpm typecheck`, `pnpm lint`, `pnpm test` (усі пакети), `REDIS_TEST_URL=… pnpm --filter backend test:redis` з реальним сервером, `pnpm --filter frontend test:e2e` (UI-зміни етапу 7), `pnpm docs:build && pnpm docs:verify`.
      **AC:** усі команди, **включно з E2E**, зелені; вивід (кількість тестів) записано в `progress.md`. E2E обов'язкові за Definition of Done для UI-змін: якщо їх не вдалося запустити, T10.2 лишається **незавершеною** (причина записується, але AC не вважається виконаним), і feat-016 не переводиться в `done`.
- [ ] **T10.3** → T10.2. Evidence of Completion у `progress.md`; PR у `main`; після рев'ю й злиття — feat-016 → `done`.
      **AC:** feat-016 `done` у `feature_list.json` з посиланням на evidence.

---

### Критичний шлях

T0 → T1.1 → T1.2 → T2.1 → T2.2 → T2.3 → T3.x → (T4.x ∥ T5.x ∥ T6.1) → T7.x → T8.x → T9.x → T10.1 → T10.2 → T10.3

T2.4 можна робити одразу після T2.1. Етапи 4, 5 і 6 незалежні після етапу 3. T8.1 можна писати одразу; T8.2–T8.6 — паралельно з етапами 4–7 після T3.1 (їм потрібні `saveSession`/`destroySession` через `withRedis` і підключені сигнали здоров'я).
