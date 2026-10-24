# План закриття відкритих пунктів

Джерело: [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md), стан на 2026-10-24.
Відкриті пункти: 16–30, 32–59, 61–64, 66–68 (усього 50); п. 55 свідомо відкладено (Р3), решта 49 розподілено по фічах.

**Редакція 2** (після рев'ю): кроки розбито на вужчі фічі, залежності розділено на жорсткі й координаційні, кожен пункт має однозначний критерій приймання, Docker і N+1 уточнено за кодом.

## Правила

- Кожна фіча — окремий запис у `feature_list.json` через PR у `main`. Id нижче (`F01…`) — робочі; реальний id (`feat-018`, …) присвоюється в момент створення запису. Format Baseline уже має `feat-010`.
- Одна фіча в роботі на власника; `progress.md` і `session-handoff.md` — на гілці фічі.
- Definition of Done з `AGENTS.md`: `pnpm typecheck`, `pnpm lint`, `pnpm test` (+ `pnpm --filter frontend test:e2e`, якщо зачеплено UI), ручна перевірка, evidence у `progress.md`.
- Зміна публічної поведінки бекенду оновлює сторінку в `documentation/backend/` у тому ж PR; `pnpm docs:build && pnpm docs:verify`.
- Пункт вважається закритим лише тоді, коли виконано **всі** його критерії приймання. Частина, яку свідомо не робимо, виноситься в новий пункт `code-issues-found-during-docs.md` з номером, а не лишається в тексті «або».
- Після merge — рядок «Виправлено» в `code-issues-found-during-docs.md` і рядок у таблиці «Стан».
- Рішення власника (2026-10-24) записано в розділі «Прийняті рішення»; критерії приймання написані під них.

## Прийняті рішення (2026-10-24)

| #   | Пункт | Рішення                                                                                                                                |
| --- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Р1  | 45    | Аватари завантажуються з `publicRead`                                                                                                  |
| Р2  | 47    | Перенос push-підписки на іншого користувача лише при збігу `p256dh` і `auth`, інакше `409`                                             |
| Р3  | 55    | Відкладено: тестовий застосунок, промпти не очищаються; пункт лишається відкритим, повернутися перед роботою з реальними користувачами |
| Р4  | 64    | Playground без черги повідомлень: без з'єднання — помилка «not connected»                                                              |
| Р5  | 66    | Відмовитися від `is_admin`, роль визначає лише `role`; значення `is_admin` не переносяться                                             |

## Фічі і залежності

| Фіча | Назва                   | Пункти              | Жорсткі залежності | Розмір   |
| ---- | ----------------------- | ------------------- | ------------------ | -------- |
| F00  | Format Baseline         | 16 (+Prettier з 68) | —                  | S        |
| F01  | App CI                  | 36, 37, 38          | F00                | M        |
| F02  | Docker Hardening        | 28, 29, 30          | F00                | M        |
| F03  | HTTP/WS Response Safety | 18, 42              | F00                | S        |
| F04  | Push Access & Methods   | 47, 48, 67          | F00                | S        |
| F19  | PG Test Harness         | — (передумова)      | F00                | S        |
| F05  | Push Data Access        | 20, 21, 49          | F04, F19           | M        |
| F06  | Storage Hardening       | 32, 44, 45, 46      | F00                | M        |
| F07  | WebSocket Cleanup       | 17, 19              | F00                | S        |
| F08  | Layering Cleanup        | 22, 24, 25          | F19                | S        |
| F09  | Validation Cleanup      | 26, 27              | F00                | S        |
| F10  | AI Reliability          | 23, 50, 51          | F00                | M        |
| F11  | AI Usage Accounting     | 53                  | F10                | M        |
| F12  | AI Quality              | 43, 52, 54          | F00                | M        |
| F13  | Observability           | 33, 34, 35          | F00                | M        |
| F14  | Static Caching          | 39, 40, 41          | F00                | M        |
| F15  | Shared Cleanup          | 56, 57, 58          | F00                | S        |
| F16  | Frontend & Playground   | 59, 61, 62, 63, 64  | F00                | S        |
| F17  | Drop `users.is_admin`   | 66                  | F00                | S        |
| F18  | ESLint Strict           | 68                  | F00, F01           | M (3 PR) |

Відповідність робочих id і записів у `feature_list.json`:

| Фіча | id         |
| ---- | ---------- |
| F00  | `feat-010` |
| F01  | `feat-018` |
| F02  | `feat-019` |
| F03  | `feat-020` |
| F04  | `feat-021` |
| F05  | `feat-022` |
| F06  | `feat-023` |
| F07  | `feat-024` |
| F08  | `feat-025` |
| F09  | `feat-026` |
| F10  | `feat-027` |
| F11  | `feat-028` |
| F12  | `feat-029` |
| F13  | `feat-030` |
| F14  | `feat-031` |
| F15  | `feat-032` |
| F16  | `feat-033` |
| F17  | `feat-034` |
| F18  | `feat-035` |
| F19  | `feat-036` |

Жорсткі залежності — лише там, де фіча використовує результат іншої:

- **F00 → усі:** масове форматування конфліктує з будь-якою гілкою; після нього diff показує лише суть.
- **F04 → F05:** обидві змінюють push-сервіси; F05 будує репозиторій логів поверх уже виправлених маршрутів і guard'ів.
- **F19 → F05, F08:** pg-тести (контракт N+1, транзакція `clearEmbedding`) потребують справжнього PostgreSQL; у F19 один власник цієї інфраструктури.
- **F10 → F11:** облік usage (п. 53) підключається до AI-сервісу, який з'являється у F10 (п. 23).
- **F01 → F18:** вмикання суворих правил без CI не захищене від регресій.

F01 (CI) **рекомендовано** влити рано, але це не блокер: до нього DoD виконується локально через `./init.sh`, як і зараз.

### Координація за файлами (не залежності)

Ці пари можна вести паралельно, але PR, що влитий другим, робить rebase і перевіряє перетин вручну:

| Файл / область                                               | Фічі     | Як координуємо                                                          |
| ------------------------------------------------------------ | -------- | ----------------------------------------------------------------------- |
| `src/vendor/start/server.ts` (`sendResponse`, `handleError`) | F03, F13 | F03 першою (менша), F13 — після rebase                                  |
| `Dockerfile`                                                 | F02, F13 | F02 ставить `HEALTHCHECK` на `/api/ping`; F13 перемикає на `/api/ready` |
| `src/app/routes/http-routes.ts`                              | F04, F03 | різні групи маршрутів; конфлікт тривіальний                             |
| `avatar-service.ts`, `knowledge-base-service.ts`             | F06      | п. 44, 45, 46 зібрано в одну фічу саме через ці файли                   |
| `src/app/validate/*`                                         | F09      | п. 26 і 27 разом                                                        |
| `prompt-controller.ts`                                       | F10, F11 | послідовно через жорстку залежність                                     |
| `src/app/websocket/ws-coordinator.ts`                        | F07, F08 | F07 видаляє мертвий код, F08 переносить виклики в сервіс; F07 першою    |

Реалістична паралельність після F00: 3–4 фічі одночасно з різних рядків таблиці вище.

---

## F00. Format Baseline — `feat-010` (п. 16, Prettier-частина п. 68)

1. Перед стартом: оголосити заморозку, попросити власників влити або запушити гілки; після merge — rebase.
2. Кореневий `.prettierrc`: `tabWidth: 4`, `singleQuote: true`, `semi: false`, `printWidth: 100`. Звірити з пакетними конфігами (frontend, api-playground) і прибрати розбіжності.
3. `.prettierignore`: `dist`, `node_modules`, `coverage`, `playwright-report`, `test-results`, `src/drizzle/migrations`, `documentation/.vitepress/{cache,dist}`, `pnpm-lock.yaml`, `graphify-out`.
4. Перевірити, що ESLint не має стильових правил, які конфліктують з Prettier.
5. `pnpm format` окремим комітом без інших змін; хеш у `.git-blame-ignore-revs`.

**Приймання:** `pnpm format:check` — 0 файлів; typecheck, lint, test, e2e зелені; `git diff --stat` форматувального коміту не містить змін поза форматуванням (перевірка `git diff -w --ignore-blank-lines` на вибірці + зелені тести); `.git-blame-ignore-revs` містить хеш.

## F01. App CI (п. 36, 37, 38)

Наявний `.github/workflows/redis-tests.yml` лишається окремим: він єдиний запускає `test:redis` з Redis-сервісом. Новий `ci.yml` його не дублює (`*.redis.test.ts` без `REDIS_TEST_URL` і так пропускаються).

1. `.github/workflows/ci.yml` на `pull_request` і `push` у `main`; ті самі кроки підготовки, що в `redis-tests.yml`: `pnpm/action-setup`, `setup-node` з `.nvmrc` і `cache: pnpm`, `pnpm install --frozen-lockfile`.
2. Передумови чистого checkout (явно в workflow, у такому порядку):
    - `pnpm --filter shared build` — від `shared/dist` залежать typecheck і тести backend/frontend;
    - job `quality`: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`;
    - job `e2e`: `pnpm --filter shared build` → `pnpm --filter frontend build` (Playwright у CI запускає `preview`, якому потрібен `dist`) → `pnpm --filter frontend exec playwright install --with-deps` (усі браузери з `projects` у `playwright.config.ts`: chromium, firefox, webkit — WebKit також обслуговує Mobile Safari) → `pnpm --filter frontend test:e2e`; кеш `~/.cache/ms-playwright`; звіт як artifact при падінні.
3. `packages/frontend/playwright.config.ts`: `npm run preview` / `npm run dev` → `pnpm preview` / `pnpm dev` (п. 38).
4. `packages/backend/vitest.config.ts`: `testTimeout: 15_000` і `maxWorkers` з env для CI (п. 37).
5. `@vitest/coverage-v8` у backend і frontend, скрипт `test:coverage`, звіт як artifact. Поріг не вводимо (окреме рішення після baseline).
6. Branch protection: `quality` і `e2e` обов'язкові (налаштовує власник репозиторію вручну, фіксується в evidence скріншотом або описом).
7. `documentation/backend/testing.md`: розділ CI і coverage.

**Приймання:** workflow зелений на PR з чистого checkout без кешу (перший прогін); у звіті e2e присутні всі чотири проєкти (`chromium`, `firefox`, `webkit`, `Mobile Safari`), жоден не пропущено; навмисно зламаний тест/lint у тимчасовому коміті валить відповідний job (negative control, коміт потім видаляється); `test:redis` і далі запускається лише `redis-tests.yml`.

## F02. Docker Hardening (п. 28, 29, 30)

Факти з `Dockerfile`: обидва етапи на `ubuntu:24.04`, Node ставиться з NodeSource; користувача `node` немає (в образі є лише `ubuntu` з uid 1000); production-етап має `curl`; `CMD` — `sh -c "… && pnpm db:create:prod && pnpm db:migrate && pnpm start"`.

1. **п. 28:** `.dockerignore`: `**/node_modules`, `**/dist`, `**/.env`, `**/.env.*`, `!**/.env.example`, `.git`, `coverage`, `**/playwright-report`, `**/test-results`, `documentation/.vitepress/cache`, `documentation/.vitepress/dist`, `graphify-out`.
2. **п. 29, користувач:** у production-етапі створити системного користувача явно: `groupadd --system app && useradd --system --gid app --no-create-home app`; `chown` лише каталогів, у які застосунок пише (якщо таких немає — тільки читання); `USER app` після всіх `COPY`. Не покладатися на `ubuntu`/`node`.
3. **п. 29, HEALTHCHECK:** `HEALTHCHECK CMD curl -fsS http://127.0.0.1:${APP_PORT:-3000}/api/ping || exit 1` з `--interval`, `--timeout`, `--start-period`. Префікс — з урахуванням `API_PATH_PREFIX` (default `api`); якщо префікс змінено, healthcheck задається при запуску, це описати в `deployment.md`.
4. **п. 30:** `CMD ["node", "dist/index.js"]` (через `exec`-форму, щоб PID 1 був Node). `db:create:prod`/`db:migrate` — окремий one-shot запуск того самого образу: `docker run --rm <img> pnpm db:migrate`; описати в `deployment.md` (порядок: migrate → rollout).

**Перевірка відсутності секретів (замість `ls -la`):**

- canary: перед збіркою створити `packages/backend/.env` і `.env` у корені з унікальним маркером (`CANARY_<random>`);
- builder-етап: `docker build --target builder -t tmp-builder .` → `docker run --rm tmp-builder sh -c 'grep -rl CANARY_ / --exclude-dir=proc 2>/dev/null'` — порожньо;
- усі шари фінального образу: `docker save <img> | tar -x` у scratchpad і `grep -rl CANARY_` по розпакованих шарах — порожньо;
- `docker history --no-trunc <img>` не містить значень з `.env`.

Допоміжне свідчення (не перевірка canary): розмір `transferring context` у `docker build --progress=plain` до/після `.dockerignore`.

**Приймання:** три перевірки canary (builder-етап, шари `docker save`, `docker history`) порожні; `docker run` → `docker exec <c> id -u` ≠ 0; `docker inspect` показує `healthy` при живому застосунку; сценарій `unhealthy` при працюючому контейнері: запуск з `API_PATH_PREFIX=v1` без перевизначення healthcheck — процес живий, `/api/ping` дає 404, статус переходить в `unhealthy` після `retries` (це ж підтверджує застереження про префікс у `deployment.md`); `docker stop` → у логах shutdown-хендлер з `src/index.ts`, контейнер завершується швидше за `--time` (без SIGKILL, exit 0/143); міграції не запускаються при старті контейнера; розмір образу і час збірки до/після в evidence.

## F03. HTTP/WS Response Safety (п. 18, 42)

1. **п. 18:** `ws-handlers.ts` — якщо `onUpgrade` повернув `null`, відповісти `401` до `res.upgrade`.
2. **п. 42:** `sendResponse` ставить `Cache-Control: no-store` на всі API-відповіді, якщо контролер не задав власний `Cache-Control` у `responseData.headers`. Статику не зачіпає.

**Приймання:** тест: токен правильного формату без сесії → `401`, `res.upgrade` не викликано, `onOpen` не настає; тест: JSON-відповідь, 204 і 4xx мають `no-store`; явний заголовок контролера не перезаписується; статика без змін. `websocket.md`, `caching.md` оновлено.

## F04. Push Access & Methods (п. 47, 48, 67)

1. **п. 48:** `test-push` → `POST`; фронтенд, playground, документація.
2. **п. 47 (рішення Р2):** `createSubscription` переносить підписку на іншого користувача лише при збігу `p256dh` і `auth`; інакше — `409 conflict`, endpoint лишається за старим власником.
3. **п. 67:** `auth_guard` на групі `push-subscriptions`, `vapid-public-key` винести в групу без guard; WS `admin/subscribe_online_users` — guard на маршруті, перевірку ролі з `admin-ws-channel-service.ts` лишити як defense-in-depth.

**Приймання:** `GET /test-push` → 404/405; анонімний запит до будь-якого push-маршруту, крім `vapid-public-key`, → `401` від guard (тест); тест на перенос з тими самими і з іншими ключами; не-адмін на WS-маршруті → помилка від guard.

## F19. PG Test Harness (передумова для F05, F08)

1. Конвенція `*.pg.test.ts`, окремий `vitest.pg.config.ts` і скрипт `test:pg` у backend; без `PG_TEST_URL` тести пропускаються (як `*.redis.test.ts`).
2. Хелпер: створення тимчасової БД/схеми на прогін, застосування міграцій (`drizzle-kit migrate`), очищення після.
3. Workflow `pg-tests.yml` за зразком `redis-tests.yml`: сервіс `pgvector/pgvector:pg16` з healthcheck, `PG_TEST_URL`, `pnpm --filter shared build`, `pnpm --filter backend test:pg`.
4. Один smoke-тест: міграції застосовуються, `SELECT 1` проходить, розширення `vector` є.
5. `testing.md`: як запустити локально.

**Приймання:** `pg-tests.yml` зелений на PR; без `PG_TEST_URL` `pnpm test` не змінює поведінку (тести пропущено); локальний запуск з Docker-PostgreSQL описано й перевірено.

## F05. Push Data Access (п. 20, 21, 49)

1. **п. 20:** `push-notification-log-repository`: insert логу, вибірки для статистики. `push-notification-sender-service.ts` і `push-subscription-statistics-service.ts` не імпортують `db`.
2. **п. 21, `findByUserIdWithLogs` — зберегти контракт.** Поточна поведінка (`push-subscription-repository.ts:112`): підписки користувача за `createdAt desc`; для кожної — **до 5 останніх** логів за `sentAt desc`, поля `id`, `messageTitle`, `status`, `sentAt`; підписка без логів має `notificationLogs: []`. Реалізація — два запити: підписки + логи через `row_number() over (partition by subscription_id order by sent_at desc) <= 5` з `inArray(subscriptionId, ids)` (або `LATERAL … LIMIT 5`); групування в JS зі збереженням порядку підписок. Порожній список підписок — без другого запиту.
3. **п. 21, статистика:** агрегати через `count()`/`group by` у SQL; формат відповіді сервісу не змінюється.
4. **п. 49:** `sendToUser` — паралельна відправка з лімітом конкурентності (наприклад 5) і один пакетний insert логів після відправки. Підключення push до бізнес-подій (`skipIfOnline`, `notificationType`) — **поза фічею**: виноситься в новий пункт `code-issues-found-during-docs.md`.

**Приймання (п. 21):** тест на справжньому PostgreSQL (див. нижче) з фікстурою: 3 підписки — з 7 логами, з 2 логами, без логів; результат: ≤5 логів, саме найновіші, у порядку `sentAt desc`, `[]` для третьої, порядок підписок `createdAt desc`; результат ідентичний старій реалізації на тій самій фікстурі (порівняння з копією старої функції в тесті); рівно 2 запити. Статистика: тест, що числа збігаються зі старим JS-розрахунком на фікстурі.

Інфраструктура pg-тестів — передумова, її власник — F19 (див. нижче).

## F06. Storage Hardening (п. 32, 44, 45, 46)

1. **п. 44:** `buildKey` у `deleteFromS3`; прибрати `buildFullS3Key` з `avatar-service.ts` і `knowledge-base-service.ts`.
2. **п. 45 (рішення Р1: `publicRead` для аватарів):** відповідає поточному фронтенду (читає за CDN URL); signed URL — окремий пункт, якщо знадобиться приватність аватарів.
3. **п. 46:** перевірка magic bytes (JPEG, PNG, WebP, GIF для аватарів; дозволені типи бази знань), розширення — з перевіреного типу, а не з імені файлу.
4. **п. 32:** `corsS3.xml` — `AllowedOrigin` з доменами застосунку (placeholder), лише `GET`/`HEAD`; приклад для prod окремим файлом.

**Приймання:** тест: `deleteFromS3('relative/key')` видаляє `<prefix>/relative/key`; тест: файл з `Content-Type: image/png` і вмістом не-PNG → `415`/`422`; ім'я `x.exe` з PNG-вмістом зберігається як `.png`; аватар завантажується з ACL `public-read` (перевірка параметрів виклику S3); у `corsS3.xml` немає `*` і `PUT`/`POST`. `storage.md` оновлено.

## F07. WebSocket Cleanup (п. 17, 19)

1. **п. 17:** префікс подій з `VITE_API_PATH_PREFIX` (default `api`), тип в `env.d.ts`, `.env.example` фронтенду. Перевірити й закрити follow-up feat-009 (`websocketApiResolve[key]` vs ключ `event`).
2. **п. 19:** видалити `src/app/state/user-storage.ts`, недосяжну гілку «Event not found» в `onMessage`, reconnect/ping-логіку `websocket-base.ts` (типи лишити або перенести).

**Приймання:** unit-тест формування події з префіксом `api` і `v1`; ручна перевірка: бекенд з `API_PATH_PREFIX=v1` + фронтенд з `VITE_API_PATH_PREFIX=v1` — WS-виклики працюють; `grep` не знаходить видалених символів; e2e зелені.

## F08. Layering Cleanup (п. 22, 24, 25)

1. **п. 22:** `admin-user-controller.ts`, `ws-coordinator.ts` → виклики через сервіси; `admin-guard.ts` лишається з прямим викликом репозиторію як задокументований виняток в `architecture.md`; типи в контролерах — з `shared` або сервісу.
2. **п. 24:** barrel експортує всі репозиторії, імпорти уніфіковано через barrel; `logger` прибрано з `user-online-repository.ts` (логування — у сервісі).
3. **п. 25:** `clearEmbedding` у `db.transaction`, колонки через об'єкти схеми в `sql`.

**Приймання:** `grep` — контролери й `ws-coordinator` не імпортують `#app/repositories` (крім задокументованих винятків); жоден репозиторій не імпортує logger; тест: помилка другого запиту `clearEmbedding` відкочує перший (pg-тест на інфраструктурі F19).

## F09. Validation Cleanup (п. 26, 27)

1. **п. 26:** ArkType-адаптер мапить `ArkErrors` у `messages: [{ path, message }]`; `summary` лишається в `message`.
2. **п. 27:** видалити `validate/schemas/schemas.ts` і закоментовані імпорти, `testSentryError`; виправити docstring `validation-error.ts` і назву `nativeValidator`; README: `400` → `422`. Невиконані §3.6, §5.6, §9 ADR 0001 — записати в ADR як «не робимо» з причиною або винести окремими пунктами.

**Приймання:** тест: тіло з двома невалідними полями → 422 з двома елементами `messages[]` з правильними `path`; формат помилки описано в `validation.md` і shared-схемі відповіді; видалені символи не знаходяться `grep`.

## F10. AI Reliability (п. 23, 50, 51)

1. **п. 50:** `AI_TEXT_DRIVER` ∈ {`openai`, `xai`, `mistral`} у `validate-runtime-config.ts`; невідоме значення — помилка на старті.
2. **п. 51:** env `AI_REQUEST_TIMEOUT_MS` (default 60 000); кожен адаптер передає `AbortSignal` (`AbortSignal.any` з таймаутом і сигналом запиту); закриття HTTP-запиту (`onAborted`) або WS-з'єднання скасовує виклик.
3. **п. 23:** `prompt-controller` викликає AI-сервіс через `textAdapter`, без власного `fetch`; помилки провайдера → `AppError` (`502 upstream_error`, таймаут → `504`), без тексту провайдера у відповіді.

**Приймання:** тест: `AI_TEXT_DRIVER=foo` → старт падає з повідомленням; тест з фейковим провайдером, що не відповідає → `504` після таймауту; тест: abort запиту скасовує fetch (сигнал `aborted`); `prompt-controller.ts` не містить `fetch` і `throw new Error`. `ai.md`, `configuration.md`, `.env.example`.

## F11. AI Usage Accounting (п. 53)

1. **п. 53:** `onComplete` для перекладу (`SUPPORT_QUERY_TRANSLATION`) і тесту промпту (`PROMPT_TEST`); облік embeddings (кількість токенів з відповіді провайдера); якщо провайдер (зокрема Mistral) не повернув usage — запис з `NULL`-токенами і `warn`, а не мовчазний пропуск.
2. **Схема:** `prompt_tokens`, `completion_tokens`, `total_tokens` у `llm_text_usage` стають nullable (`NULL` = провайдер не повідомив usage, `0` = справжній нуль); міграція `DROP NOT NULL` без зміни наявних рядків; default `0` прибрати, щоб пропущене значення не маскувалося нулем.
3. **Контракти:** тип рядка в репозиторії/транформері, shared-схема відповіді `/admin/usage/text` (`number | null`), агрегати в статистиці — `sum` ігнорує `NULL`, окремо повертається кількість записів без usage; адмінка показує «—» для `NULL`.

П. 55 (retention `final_prompt`) у цю фічу не входить — рішення Р3.

**Приймання:** тести: кожен з чотирьох шляхів пише рядок usage (переклад, тест промпту, embeddings, провайдер без usage — з `NULL`-токенами і `warn`); `drizzle-kit check` чистий, міграція застосовується на БД з наявними рядками; тест агрегатів: `NULL` не враховується в сумі й рахується окремо; `ai.md`, `database.md` оновлено.

## F12. AI Quality (п. 43, 52, 54)

1. **п. 52:** мова з профілю користувача, fallback — `Accept-Language`/параметр запиту, далі default з конфігу; `'ru'` у коді немає.
2. **п. 54:** на старті перевірка, що `OPENAI_EMBEDDING_DIMENSIONS` = розмірності колонки (1536), інакше помилка; `reindexAll` батчами (env `SUPPORT_EMBEDDING_BATCH_SIZE`, default 50); `searchByEmbedding` з порогом відстані (env, default за результатами ручної перевірки на базі знань).
3. **п. 43:** TTL кешу промптів (env `PROMPT_CACHE_TTL_MS`, default 60 000) + інвалідація на тому ж інстансі при оновленні. Pub/sub між інстансами — поза фічею; затримка ≤ TTL фіксується в документації.

**Приймання:** тести: мова з профілю; невідповідна розмірність → помилка старту; `reindexAll` для 120 статей робить 3 виклики `embedBatch`; результати далі порогу не потрапляють у контекст; промпт оновлюється в кеші після TTL (fake timers).

## F13. Observability (п. 33, 34, 35)

1. **п. 34:** `LOG_LEVEL` (`fatal…trace`, default `info`, невалідне значення — помилка старту); `.env.example`, `configuration.md`.
2. **п. 33:** `handleError` отримує request logger; `userId` додається в child-контекст HTTP і WS, коли сесія відома.
3. **п. 35:** `GET /<prefix>/ready`: `SELECT 1` у PostgreSQL і `PING` у Redis з таймаутом на кожну перевірку (env, default 1 000 мс); `200 {status:"ok"}` або `503 {status:"unavailable"}` без деталей; без rate limit L1, без сесії. `HEALTHCHECK` у `Dockerfile` перевести на `/ready` (rebase після F02).

**Приймання:** тест: warn для 413/422 містить `requestId`; лог автентифікованого запиту містить `userId`; `LOG_LEVEL=debug` вмикає debug-записи; `/ready` → 200 при живих DB/Redis, 503 за ≤ таймаут+запас при недоступному Redis (мок) і БД; `observability.md`, `deployment.md`, `routes`.

## F14. Static Caching (п. 39, 40, 41)

1. **п. 39:** `public, max-age=31536000, immutable` — лише для `/assets/*`; HTML, `manifest.json`, `service-worker.js`, іконки, аудіо — `no-cache` (з ETag).
2. **п. 40:** розбір `If-None-Match` за RFC 9110: список через кому, `*`, слабке порівняння `W/"…"`.
3. **п. 41 (однозначний результат):**
    - файли до `STATIC_MAX_MEMORY_FILE_SIZE` (default 1 MiB) кешуються в RAM, більші — **стрімляться з диска** з ETag за `size+mtime`;
    - сумарний обсяг RAM-кешу обмежено `STATIC_MAX_MEMORY_TOTAL` (default 64 MiB); файли понад ліміт теж ідуть стрімінгом;
    - якщо поруч є `.br`/`.gz` (генеруються при збірці фронтенду), вони віддаються за `Accept-Encoding` з `Vary: Accept-Encoding`.

**Приймання:** тести на `Cache-Control` для `/assets/x.js`, `/manifest.json`, `/service-worker.js`; `If-None-Match` зі списком, `*`, `W/` → 304; файл 5 MiB віддається стрімінгом (не потрапляє в Map кешу), відповідь побайтно ідентична; при `Accept-Encoding: br` віддається `.br` з `Content-Encoding: br`; використання RAM після старту ≤ ліміту (лог розміру кешу). `caching.md`.

## F15. Shared Cleanup (п. 56, 57, 58)

1. **п. 56:** порожній `languages.test.js` замінити реальними тестами: enums мов, `utils/phone`, guards (`isWsChannel`), ключові схеми. Видалення без нових тестів пункт **не** закриває.
2. **п. 57:** guards після feat-005 не порожні — додати реекспорт у `src/index.ts` (або прибрати `./guards` з `exports`, якщо імпорт лише через підшлях); узгодити з фактичними імпортами.
3. **п. 58:** `.brand('EntityId')` для `EntityIdSchema`; виправити місця, де plain string передається як id.

**Приймання:** `pnpm --filter shared test` показує ≥ 1 реальний тест на кожен з перелічених модулів (не `pass 1` від порожнього файлу); `import { isWsChannel } from 'shared'` працює (або підшлях задокументовано); typecheck ловить передачу небрендованого рядка (тест типів через `// @ts-expect-error`).

## F16. Frontend & Playground (п. 59, 61, 62, 63, 64)

1. **п. 59:** fallback `VITE_BASE_URL` → відносний шлях (same-origin через Vite proxy).
2. **п. 61:** усі `VITE_*` типізовано в `env.d.ts`; прибрано закоментований код push і хибний коментар «щохвилини» в `main.ts`.
3. **п. 62:** playground бере префікс з `baseUrl`/`API_PATH_PREFIX`; Vite proxy — з тієї ж змінної.
4. **п. 63:** `https://` → `wss://`, `http://` → `ws://`.
5. **п. 64 (рішення Р4: без черги):** `sendMessage` без з'єднання повертає помилку і показує «not connected»; повідомлення «message queued» прибрано.
6. Follow-up feat-009: `/health` у playground.

**Приймання:** dev-фронтенд без `VITE_BASE_URL` ходить через proxy (ручна перевірка в DevTools); typecheck падає на звертанні до нетипізованої `VITE_*`; unit-тести перетворення URL (`https`→`wss`, `http`→`ws`) і `sendMessage` без з'єднання; playground з `API_PATH_PREFIX=v1` завантажує список маршрутів.

## F17. Drop `users.is_admin` (п. 66)

Рішення Р5: єдине джерело ролі — `role`; значення `is_admin` ігноруються і не переносяться.

1. Інформаційно: `SELECT count(*) FROM users WHERE is_admin AND role <> 'admin'` — число в evidence і в описі PR (такі користувачі не мали адмін-доступу й раніше, бо guard'и читають лише `role`).
2. Прибрати всі читання/записи `isAdmin` у коді (схема, репозиторії, транформери, seed, shared-типи) — окремим комітом до міграції.
3. Міграція (folder-per-migration, drizzle 1.0) видаляє колонку; схема, транформери, shared-типи.
4. `database.md`; нотатка про незворотність у PR.

**Приймання:** `drizzle-kit check` чистий; міграція застосовується на копії БД з seed `--demo`; `grep isAdmin` знаходить лише фронтенд-метод `isAdmin()` стору, що читає `role`.

## F18. ESLint Strict (п. 68)

Три PR, по одному на пакет: backend → frontend → api-playground. У кожному: увімкнути вимкнені правила `strictTypeChecked`, виправити порушення; правила, які свідомо лишаються вимкненими, — з коментарем-причиною в `eslint.config.ts`.

**Приймання (на кожен PR):** `pnpm lint` зелений; список правил, що лишилися вимкненими, з причинами в evidence; поведінкових змін немає (тести зелені без змін у тестах, крім типів). Пункт 68 закривається після третього PR.

---

## Чек-лист на кожну фічу

- [ ] PR у `main`: запис у `feature_list.json` (owner, branch, `in_progress`), жорсткі залежності `done`
- [ ] нові рішення, що виникли під час фічі, погоджено з власником і записано в `progress.md`
- [ ] гілка, `progress.md`, `./init.sh` зелений
- [ ] для M-фіч — детальний план `docs/plan/<slug>-plan.md`
- [ ] реалізація + тести поруч із кодом; критерії приймання кожного пункту виконано
- [ ] документація в `documentation/backend/` + `docs:build`/`docs:verify`
- [ ] перетини з таблиці координації перевірено після rebase
- [ ] evidence у `progress.md`, PR, review
- [ ] «Виправлено» і таблиця «Стан» у `code-issues-found-during-docs.md`; винесені частини — новими пунктами
- [ ] PR у `main`: статус `done` з посиланням на evidence
