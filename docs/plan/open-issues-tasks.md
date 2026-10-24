# Task list: закриття відкритих пунктів code-issues

Джерело: [open-issues-roadmap.md](./open-issues-roadmap.md) (редакція 2 + рішення Р1–Р5).
Кожна задача атомарна (≤ 0.5 дня), з критерієм приймання (**AC**). `→` — залежність; без стрілки задачі фічі виконуються послідовно. Після кожної задачі: `pnpm typecheck`, `pnpm lint`, тести зачепленого пакета зелені.

Однакові для кожної фічі кроки винесено в шаблони, щоб не повторювати їх 20 разів:

- **S (start):** PR у `main` — запис фічі в `feature_list.json` (реальний id, `owner`, `branch`, `in_progress`), жорсткі залежності `done`; гілка від свіжого `main`; `progress.md` (мета, посилання на roadmap і цей файл); `./init.sh` зелений. Для M-фіч — у тому ж PR детальний `docs/plan/<slug>-plan.md`.
  **AC:** рядок `in_progress` на `main`, `init.sh` зелений, `progress.md` закомічено.
- **D (docs):** оновити сторінки `documentation/backend/…`, названі в задачі; `.env.example` для нових env; `pnpm docs:build && pnpm docs:verify`.
  **AC:** обидві команди зелені.
- **R (rebase):** перед відкриттям PR — rebase на свіжий `main`; для кожного рядка таблиці «Координація за файлами» roadmap, що стосується фічі, перевірити перетин з уже влитою фічею (diff спільних файлів, тести обох фіч зелені).
  **AC:** результат перевірки перетинів (або «перетинів немає») у `progress.md`.
- **E (evidence):** шаблони D і R виконано; `pnpm typecheck`, `pnpm lint`, `pnpm test` (+ `pnpm --filter frontend test:e2e`, якщо зачеплено UI), `pnpm docs:build && pnpm docs:verify`, ручна перевірка golden path — вивід і кроки в **Evidence of Completion** у `progress.md`; нові рішення, що виникли під час фічі (не з Р1–Р5), погоджено з власником і записано в `progress.md`; рядки «Виправлено» і таблиця «Стан» у `code-issues-found-during-docs.md`; PR, review.
  **AC:** PR злито.
- **X (done):** PR у `main` — статус `done` з посиланням на evidence.
  **AC:** рядок `done` на `main`.

---

## Хвиля 0 — підготовка

- [x] **W0.1** PR у `main`: roadmap, цей task list, записи для F01–F19 у `feature_list.json` зі статусом `not-started`, залежностями з roadmap і посиланням на розділ roadmap в `description`. feat-010 (F00) — оновити `description` (206 файлів, посилання на roadmap).
      **AC:** PR злито; кожна фіча має реальний id; у roadmap додано таблицю відповідності `F… → feat-…`.
- [x] **W0.2** У `code-issues-found-during-docs.md`: п. 55 — рядок «Відкладено (Р3)»; у «Що варто зробити далі» — посилання на roadmap.
      **AC:** у тому ж PR, що W0.1.

## Хвиля 1 — F00 Format Baseline (`feat-010`)

Решта фіч стартує лише після F00 `done`.

- [x] **F00.S** Шаблон S. Перед стартом — оголошення заморозки: усі відкриті гілки влиті або запушені.
- [x] **F00.1** Інвентар: `pnpm format:check` (кількість файлів по пакетах), наявні конфіги Prettier у пакетах, стильові правила ESLint.
      **AC:** таблиця в `progress.md`.
- [x] **F00.2** Кореневий `.prettierrc` (`tabWidth: 4`, `singleQuote: true`, `semi: false`, `printWidth: 100`); пакетні конфіги прибрати або звести до кореневого, якщо пакет не має причини відрізнятися (причину записати).
      **AC:** `prettier --find-config-path` для файлу кожного пакета вказує на очікуваний конфіг.
- [x] **F00.3** `.prettierignore`: `dist`, `node_modules`, `coverage`, `playwright-report`, `test-results`, `src/drizzle/migrations`, `documentation/.vitepress/cache`, `documentation/.vitepress/dist`, `pnpm-lock.yaml`, `graphify-out`.
      **AC:** `prettier --check` не заходить у ці каталоги (`--log-level debug` на вибірці).
- [x] **F00.4** ESLint: стильові правила, що конфліктують з Prettier, вимкнено (`eslint-config-prettier` або явне вимкнення).
      **AC:** `pnpm lint` після F00.5 не дає стильових помилок.
- [x] **F00.5** → F00.2–F00.4. Окремий коміт `format: apply prettier baseline` — лише `pnpm format`.
      **AC:** `pnpm format:check` — 0 файлів; `git diff -w --ignore-blank-lines --stat` для коміту на вибірці не показує змін логіки; typecheck, lint, test, e2e зелені.
- [x] **F00.6** → F00.5. `.git-blame-ignore-revs` з хешем коміту F00.5; рядок у `README.md` про `git config blame.ignoreRevsFile`.
      **AC:** `git blame` на зміненому файлі пропускає коміт.
- [x] **F00.E** Шаблон E. **F00.X** Шаблон X + повідомлення власникам гілок про rebase.

## Хвиля 2 — інфраструктура перевірок (паралельно)

### F01 App CI (п. 36, 37, 38)

- [x] **F01.S** Шаблон S.
- [x] **F01.1** `playwright.config.ts`: `npm run preview` / `npm run dev` → `pnpm preview` / `pnpm dev` (п. 38).
      **AC:** `CI=1 pnpm --filter frontend test:e2e` локально піднімає preview через pnpm.
- [x] **F01.2** `packages/backend/vitest.config.ts`: `testTimeout: 15_000`, `maxWorkers` з env (п. 37).
      **AC:** тести зелені; навмисно повільний тест (тимчасово) падає за 15 с, не за 5.
- [x] **F01.3** `.github/workflows/ci.yml`, job `quality`: checkout → `pnpm/action-setup` → `setup-node` (`.nvmrc`, `cache: pnpm`) → `pnpm install --frozen-lockfile` → `pnpm --filter shared build` → `format:check` → `typecheck` → `lint` → `test`. `concurrency` як у `redis-tests.yml`.
      **AC:** перший прогін job на PR зелений без кешу pnpm і Playwright (кеш ще не створено або скинуто; посилання на run у evidence).
- [x] **F01.4** → F01.1, F01.3. Job `e2e`: install → shared build → `pnpm --filter frontend build` → `pnpm --filter frontend exec playwright install --with-deps` (chromium, firefox, webkit) → `test:e2e`; кеш `~/.cache/ms-playwright`; `playwright-report` artifact при падінні.
      **AC:** звіт містить проєкти `chromium`, `firefox`, `webkit`, `Mobile Safari`.
- [x] **F01.5** `@vitest/coverage-v8` у backend і frontend, скрипт `test:coverage`; у CI — окремий крок з artifact звіту, без порогу.
      **AC:** artifact з `coverage/` присутній у run.
- [x] **F01.6** Negative control: тимчасовий коміт з падаючим тестом і lint-помилкою.
      **AC:** `quality` червоний з очікуваної причини; коміт видалено; посилання на run у evidence.
- [x] **F01.6a** Розмежування з `redis-tests.yml`: `ci.yml` не задає `REDIS_TEST_URL` і не викликає `test:redis`.
      **AC:** `*.redis.test.ts` виключені з `pnpm test` через `exclude` у `vitest.config.ts` (у логах `quality` їх немає); `test:redis` запускається лише в `redis-tests.yml` (`grep test:redis .github/workflows`).
- [x] **F01.7** Branch protection: `quality` і `e2e` обов'язкові (налаштовано через `gh api` 2026-10-24: `strict`, без force-push, `enforce_admins: false`).
      **AC:** опис/скріншот налаштування в evidence.
- [x] **F01.D** Шаблон D: `testing.md` (CI, coverage, зв'язок з `redis-tests.yml`). **F01.E** ✅, **F01.X** ✅.

### F19 PG Test Harness (передумова для F05, F08)

- [x] **F19.S** Шаблон S.
- [x] **F19.1** `vitest.pg.config.ts` (include `**/*.pg.test.ts`), скрипт `test:pg`; основний `vitest.config.ts` виключає `*.pg.test.ts`.
      **AC:** `pnpm --filter backend test` не запускає pg-тести; `test:pg` без `PG_TEST_URL` пропускає їх.
- [x] **F19.2** Хелпер `test/pg/setup.ts`: тимчасова БД на прогін (`CREATE DATABASE … ` з унікальним суфіксом), `CREATE EXTENSION vector`, міграції, `DROP DATABASE` після.
      **AC:** після прогону тимчасових БД не лишається (`\l`).
- [x] **F19.3** Smoke `harness.pg.test.ts`: міграції застосовано, `SELECT 1`, розширення `vector` є.
      **AC:** зелений локально з Docker `pgvector/pgvector:pg16`.
- [x] **F19.4** `.github/workflows/pg-tests.yml` за зразком `redis-tests.yml`: сервіс `pgvector/pgvector:pg16` з healthcheck, `PG_TEST_URL`, shared build, `test:pg`; ті самі `paths`.
      **AC:** job зелений на PR.
- [x] **F19.D** Шаблон D: `testing.md` (локальний запуск pg-тестів). **F19.E** ✅, **F19.X** ✅.

### F02 Docker Hardening (п. 28, 29, 30)

- [x] **F02.S** Шаблон S (M: детальний план).
- [x] **F02.1** Baseline: розмір образу, час збірки, розмір `transferring context`.
      **AC:** числа в `progress.md`.
- [x] **F02.2** `.dockerignore` (перелік з roadmap) (п. 28).
      **AC:** `docker build` успішний; `transferring context` менший (допоміжне свідчення).
- [x] **F02.3** → F02.2. Canary-перевірки: маркер у `.env` і `packages/backend/.env`; `--target builder` + `grep`; `docker save` + `grep` по шарах; `docker history --no-trunc`.
      **AC:** усі три порожні; команди і вивід у evidence; canary-файли видалено.
- [x] **F02.4** Користувач `app` (`groupadd/useradd --system`), `chown` лише записуваних каталогів, `USER app` після `COPY` (п. 29).
      **AC:** `docker exec <c> id -u` ≠ 0; застосунок стартує і віддає статику.
- [x] **F02.5** `HEALTHCHECK` через `curl -fsS http://127.0.0.1:${APP_PORT:-3000}/api/ping` з `interval/timeout/start-period/retries` (п. 29).
      **AC:** `healthy` при живому застосунку; з `API_PATH_PREFIX=v1` контейнер працює, але стає `unhealthy` після `retries`.
- [x] **F02.6** `CMD ["node", "dist/index.js"]`; міграції — окремі one-shot запуски: `docker run --rm <img> pnpm db:create:prod`, потім `docker run --rm <img> pnpm db:migrate` (п. 30).
      **AC:** старт контейнера не запускає міграції (логи); one-shot міграція на чистій БД успішна; `docker stop` → shutdown-лог з `src/index.ts`, exit 0/143 без SIGKILL.
- [x] **F02.7** → F02.2–F02.6. Повторні вимірювання: розмір образу, час збірки (той самий кеш-стан, що в F02.1), `transferring context`.
      **AC:** таблиця до/після в evidence; зростання розміру образу пояснено.
- [x] **F02.D** Шаблон D: `deployment.md` (one-shot міграції, порядок rollout, healthcheck і префікс). **F02.E** ✅, **F02.X** ✅.

## Хвиля 3 — безпека і доступ (паралельно, після F00)

### F03 HTTP/WS Response Safety (п. 18, 42)

- [x] **F03.S** Шаблон S.
- [x] **F03.1** `ws-handlers.ts`: `dataAccess === null` → `401` до `res.upgrade` (п. 18).
      **AC:** unit (мок `res`): `upgrade` не викликано, статус 401, `onOpen` не настає.
- [x] **F03.2** `sendResponse`: `Cache-Control: no-store`, якщо контролер не задав свій (п. 42).
      **AC:** тести: 200 JSON, 204, 4xx мають `no-store`; заголовок з `responseData.headers` не перезаписується; відповіді статики без змін.
- [x] **F03.D** Шаблон D: `websocket.md`, `caching.md`. **F03.E** ✅, **F03.X** ✅.

### F04 Push Access & Methods (п. 47, 48, 67)

- [x] **F04.S** Шаблон S.
- [x] **F04.1** `test-push` → `POST` у `http-routes.ts`; виклики у frontend і playground (п. 48).
      **AC:** `GET` → 404/405; фронтенд-кнопка працює (ручна перевірка).
- [x] **F04.2** Група `push-subscriptions` з `auth_guard`; `vapid-public-key` — у групі без guard; перевірки `getUserId()` у контролері лишаються як defense-in-depth (п. 67).
      **AC:** тест: анонімно кожен маршрут групи → 401 від guard; `vapid-public-key` → 200.
- [x] **F04.3** WS `admin/subscribe_online_users`: guard ролі на маршруті (п. 67).
      **AC:** тест: не-адмін → помилка від guard, сервіс не викликано.
- [x] **F04.4** `createSubscription`: перенос на іншого користувача лише при збігу `p256dh` і `auth`, інакше `409 conflict` (Р2, п. 47).
      **AC:** unit: ті самі ключі → перенос; інші → 409, власник не змінився.
- [x] **F04.D** Шаблон D: `mail-push.md`, матриця доступу. **F04.E** ✅, **F04.X** ✅.

### F06 Storage Hardening (п. 32, 44, 45, 46)

- [x] **F06.S** Шаблон S (M).
- [x] **F06.1** `deleteFromS3` через `buildKey`; прибрати `buildFullS3Key` з `avatar-service.ts`, `knowledge-base-service.ts` (п. 44).
      **AC:** unit: відносний ключ → `<prefix>/key`; `grep buildFullS3Key` порожній.
- [x] **F06.2** Утиліта `detectFileType(buffer)` за magic bytes (JPEG, PNG, WebP, GIF + типи бази знань).
      **AC:** unit на кожну сигнатуру і на невідомий вміст.
- [x] **F06.3** → F06.2. Аватари і база знань перевіряють вміст, розширення — з виявленого типу (п. 46).
      **AC:** тести: `image/png` з не-PNG вмістом → 415/422; `x.exe` з PNG → ключ `.png`.
- [x] **F06.4** Аватари з `publicRead` (Р1, п. 45).
      **AC:** unit: параметри виклику S3 містять ACL `public-read`.
- [x] **F06.5** `corsS3.xml`: placeholder-домени, лише `GET`/`HEAD`; `corsS3.prod.example.xml` (п. 32).
      **AC:** у файлах немає `*` і `PUT`/`POST`.
- [x] **F06.D** Шаблон D: `storage.md`. **F06.E**, **F06.X**.

## Хвиля 4 — дані і шари (після F19)

### F05 Push Data Access (п. 20, 21, 49) → F04, F19

- [x] **F05.S** Шаблон S (M).
- [x] **F05.1** pg-тест-фікстура: 3 підписки (7 / 2 / 0 логів, різні `createdAt`, `sentAt`); копія поточної `findByUserIdWithLogs` у тесті як еталон.
      **AC:** тест еталона зелений на фікстурі.
- [x] **F05.2** → F05.1. `findByUserIdWithLogs`: 2 запити (`row_number() over (partition by subscription_id order by sent_at desc) <= 5` + `inArray`), групування в JS зі збереженням порядку; порожній список — без другого запиту (п. 21).
      **AC:** результат deep-equal еталону; ≤ 5 логів, `sentAt desc`, `[]` для третьої; лічильник запитів = 2 (і 1 для користувача без підписок).
- [x] **F05.3** `push-notification-log-repository.ts`: `insertMany`, запити агрегатів (п. 20).
      **AC:** pg-тести для кожного методу.
- [x] **F05.4** → F05.3. Статистика через `count()`/`group by`; сервіс без `db` (п. 20, 21).
      **AC:** pg-тест: відповідь сервісу deep-equal відповіді старої реалізації на фікстурі (ті самі ключі, типи, вкладеність і порядок елементів, не лише числа); shared-схема/тип відповіді не змінені; `grep "from '#database" ` у сервісах push порожній.
- [x] **F05.5** → F05.3. `sendToUser`: паралельно з лімітом 5, один `insertMany` логів після відправки (п. 49).
      **AC:** unit: максимум одночасних відправок = 5; один виклик запису логів на виклик `sendToUser`.
- [x] **F05.6** Новий пункт у `code-issues-found-during-docs.md`: підключення push до бізнес-подій (`skipIfOnline`, `notificationType`).
      **AC:** пункт з номером додано; п. 49 позначено виправленим з посиланням на нього.
- [x] **F05.D** Шаблон D: `mail-push.md`, `repositories-transformers.md`. **F05.E** ✅, **F05.X** ✅.

### F08 Layering Cleanup (п. 22, 24, 25) → F19

- [x] **F08.S** Шаблон S.
- [x] **F08.1** Barrel `repositories/index.ts` експортує всі репозиторії; імпорти через barrel (п. 24).
      **AC:** `grep` прямих імпортів `repositories/.../*-repository` поза barrel порожній.
- [x] **F08.2** `logger` прибрано з `user-online-repository.ts`, логування перенесено в сервіс (п. 24).
      **AC:** жоден файл у `repositories/` не імпортує logger.
- [x] **F08.3** `admin-user-controller.ts` → `adminUserService`; `ws-coordinator.ts` → сервіс (п. 22). Перед стартом — rebase на F07, якщо вона влита.
      **AC:** контролери й `ws-coordinator` не імпортують репозиторії; тести зелені.
- [x] **F08.4** Типи в `prompt-controller.ts`, `llm-usage-controller.ts` — з shared або сервісу (п. 22).
      **AC:** контролери не імпортують модулі репозиторіїв навіть як `type`.
- [x] **F08.5** `admin-guard.ts` — задокументований виняток у `architecture.md` (п. 22).
      **AC:** розділ «Дозволені винятки» в `architecture.md`.
- [x] **F08.6** `clearEmbedding` у `db.transaction`, колонки через об'єкти схеми (п. 25).
      **AC:** pg-тест: помилка другого запиту відкочує перший.
- [x] **F08.D** Шаблон D: `architecture.md`, `repositories-transformers.md`. **F08.E** ✅, **F08.X** ✅.

### F09 Validation Cleanup (п. 26, 27)

- [x] **F09.S** Шаблон S.
- [x] **F09.1** ArkType-адаптер: `ArkErrors` → `messages: [{ path, message }]`, `summary` у `message`; shared-схема відповіді 422 (п. 26).
      **AC:** тест: два невалідні поля → два елементи з правильними `path`.
- [x] **F09.2** Видалити `validate/schemas/schemas.ts` і закоментовані імпорти в `src/index.ts`, `vendor/start/server.ts`; `testSentryError` (п. 27).
      **AC:** `grep` порожній; тести зелені.
- [x] **F09.3** Docstring `validation-error.ts`; `nativeValidator` → назва за змістом у `serialize-routes.ts`; README `400` → `422` (п. 27).
      **AC:** playground показує опис валідатора як і раніше.
- [x] **F09.4** ADR 0001: §3.6, §5.6, §9 — розділ «Не робимо» з причинами або нові пункти в code-issues (п. 27).
      **AC:** кожен з трьох параграфів має рішення.
- [x] **F09.D** Шаблон D: `validation.md`. **F09.E** ✅, **F09.X** ✅.

### F07 WebSocket Cleanup (п. 17, 19)

- [ ] **F07.S** Шаблон S.
- [ ] **F07.1** `VITE_API_PATH_PREFIX` (default `api`) у `env.d.ts`, `.env.example` фронтенду; формування події в `useWebSocketConnection.ts` (п. 17).
      **AC:** unit: префікси `api` і `v1` дають `api/x` і `v1/x`.
- [ ] **F07.2** Follow-up feat-009: `websocketApiResolve[key]` vs ключ `event` — виправити або зафіксувати тестом поточну правильну поведінку.
      **AC:** тест на резолв відповіді за ключем події.
- [ ] **F07.3** Видалити `src/app/state/user-storage.ts`, гілку «Event not found» в `onMessage` (п. 19).
      **AC:** `grep` порожній; WS-тести зелені.
- [ ] **F07.4** `websocket-base.ts`: прибрати reconnect/ping, лишити (або перенести) типи (п. 19).
      **AC:** `useWebSocketConnection` компілюється; e2e зелені.
- [ ] **F07.5** Ручна перевірка: backend `API_PATH_PREFIX=v1` + frontend `VITE_API_PATH_PREFIX=v1`.
      **AC:** WS-виклики відповідають, не `not_found`; кроки в evidence.
- [ ] **F07.D** Шаблон D: `websocket.md`, frontend README. **F07.E**, **F07.X**.

## Хвиля 5 — AI (F10 → F11; F12 паралельно)

### F10 AI Reliability (п. 23, 50, 51)

- [ ] **F10.S** Шаблон S (M).
- [ ] **F10.1** `AI_TEXT_DRIVER` ∈ {`openai`, `xai`, `mistral`} у `validate-runtime-config.ts`; `ai-provider.ts` без мовчазного fallback (п. 50).
      **AC:** тест: `foo` → помилка старту; кожне валідне значення → свій адаптер.
- [ ] **F10.2** `AI_REQUEST_TIMEOUT_MS` (default 60 000) у конфігу з валідацією.
      **AC:** тест конфігу.
- [ ] **F10.3** → F10.2. Кожен адаптер приймає `signal`, комбінує з таймаутом (`AbortSignal.any`) (п. 51).
      **AC:** unit для кожного адаптера: fake fetch без відповіді → abort після таймауту.
- [ ] **F10.4** → F10.3. Передача сигналу запиту: HTTP `onAborted`, закриття WS (п. 51).
      **AC:** тести: abort HTTP-запиту (`onAborted`) → сигнал адаптера `aborted`; закриття WS-з'єднання під час AI-виклику → сигнал `aborted`, відповідь у закрите з'єднання не надсилається.
- [ ] **F10.5** → F10.3. `prompt-controller` → метод AI-сервісу через `textAdapter`; помилки провайдера → `AppError` `502 upstream_error`, таймаут → `504` (п. 23).
      **AC:** у контролері немає `fetch` і `throw new Error`; тести 502/504 без тексту провайдера у відповіді.
- [ ] **F10.D** Шаблон D: `ai.md`, `configuration.md`, `.env.example`. **F10.E**, **F10.X**.

### F11 AI Usage Accounting (п. 53) → F10

- [ ] **F11.S** Шаблон S (M).
- [ ] **F11.1** Міграція: `prompt_tokens`, `completion_tokens`, `total_tokens` — `DROP NOT NULL`, `DROP DEFAULT`; схема.
      **AC:** `drizzle-kit check` чистий; міграція застосовується на БД з наявними рядками, значення не змінились.
- [ ] **F11.2** → F11.1. Типи `number | null`: репозиторій, транформер, shared-схема `/admin/usage/text`, адмінка показує «—».
      **AC:** typecheck; unit транформера з `null`.
- [ ] **F11.3** → F11.2. Агрегати: `sum` ігнорує `NULL`, окремо кількість записів без usage.
      **AC:** тест агрегатів на фікстурі з `NULL` і `0`.
- [ ] **F11.4** → F11.2. `onComplete` для перекладу (`SUPPORT_QUERY_TRANSLATION`) і тесту промпту (`PROMPT_TEST`).
      **AC:** unit: кожен шлях пише рядок usage.
- [ ] **F11.5** → F11.2. Облік embeddings (токени з відповіді провайдера).
      **AC:** unit: виклик `embedBatch` пише рядок usage.
- [ ] **F11.6** → F11.2. Провайдер без usage (Mistral) → рядок з `NULL` і `warn`.
      **AC:** unit: запис з `null`, один `warn`.
- [ ] **F11.D** Шаблон D: `ai.md`, `database.md`. **F11.E**, **F11.X**.

### F12 AI Quality (п. 43, 52, 54)

- [ ] **F12.S** Шаблон S (M).
- [ ] **F12.1** Мова Support AI: профіль → `Accept-Language`/параметр → default з конфігу; прибрати `'ru'` (п. 52).
      **AC:** unit на кожен рівень fallback; `grep "'ru'"` у `support-service.ts` порожній.
- [ ] **F12.2** Перевірка на старті: `OPENAI_EMBEDDING_DIMENSIONS` = 1536 (розмірність колонки) (п. 54).
      **AC:** тест: інше значення → помилка старту.
- [ ] **F12.3** `reindexAll` батчами `SUPPORT_EMBEDDING_BATCH_SIZE` (default 50) (п. 54).
      **AC:** unit: 120 статей → 3 виклики `embedBatch`.
- [ ] **F12.4** Поріг відстані в `searchByEmbedding` (env); default — за ручною перевіркою на `docs/support-knowledge-base` (п. 54).
      **AC:** unit: результати далі порогу відкинуто; таблиця ручної перевірки в evidence.
- [ ] **F12.5** TTL кешу промптів `PROMPT_CACHE_TTL_MS` (default 60 000) + інвалідація на тому ж інстансі при оновленні (п. 43).
      **AC:** unit з fake timers: після TTL читається нове значення; після оновлення — одразу.
- [ ] **F12.D** Шаблон D: `ai.md`, `configuration.md`; в `ai.md` явно: оновлення промпту на інших інстансах видно із затримкою ≤ `PROMPT_CACHE_TTL_MS`, інвалідація між інстансами (pub/sub) поза фічею. **F12.E**, **F12.X**.

## Хвиля 6 — експлуатація (паралельно, після F00)

### F13 Observability (п. 33, 34, 35)

Перед F13.4 — rebase на F02 і F03, якщо вони влиті (спільні `Dockerfile`, `server.ts`).

- [ ] **F13.S** Шаблон S (M).
- [ ] **F13.1** `LOG_LEVEL` (`fatal…trace`, default `info`, невалідне → помилка старту) у `logger.ts` (п. 34).
      **AC:** тест конфігу; `LOG_LEVEL=debug` дає debug-записи.
- [ ] **F13.2** `handleError` приймає request logger (п. 33).
      **AC:** тест: warn для 413/415/422 містить `requestId`.
- [ ] **F13.3** `userId` у child-контексті HTTP і WS, коли сесія відома (п. 33).
      **AC:** тест: лог автентифікованого запиту містить `userId`, анонімного — ні.
- [ ] **F13.4** `GET /<prefix>/ready`: `SELECT 1` + Redis `PING` з таймаутом `READINESS_CHECK_TIMEOUT_MS` (1 000); `200 ok` / `503 unavailable` без деталей; без L1-ліміту і сесії (п. 35).
      **AC:** тести: обидва живі → 200; Redis або БД недоступні (мок) → 503 за ≤ таймаут + 200 мс.
- [ ] **F13.5** → F13.4. `HEALTHCHECK` у `Dockerfile` → `/api/ready` (після F02).
      **AC:** контейнер без БД — `unhealthy`; з БД — `healthy`.
- [ ] **F13.D** Шаблон D: `observability.md`, `deployment.md`, `routes.md`, `configuration.md`. **F13.E**, **F13.X**.

### F14 Static Caching (п. 39, 40, 41)

- [ ] **F14.S** Шаблон S (M).
- [ ] **F14.1** `Cache-Control`: `immutable` лише `/assets/*`, решта — `no-cache` + ETag (п. 39).
      **AC:** тести для `/assets/x.js`, `/manifest.json`, `/service-worker.js`, `/index.html`.
- [ ] **F14.2** Парсер `If-None-Match` (RFC 9110: список, `*`, `W/`) (п. 40).
      **AC:** unit на кожен випадок; 304 у static handler.
- [ ] **F14.3** RAM-кеш з `STATIC_MAX_MEMORY_FILE_SIZE` (1 MiB) і `STATIC_MAX_MEMORY_TOTAL` (64 MiB); решта — стрімінг з диска, ETag за `size+mtime` (п. 41).
      **AC:** тест: файл 5 MiB не в Map, відповідь побайтно ідентична; лог розміру кешу ≤ ліміту.
- [ ] **F14.4** Збірка фронтенду генерує `.br`/`.gz`; сервер віддає їх за `Accept-Encoding` з `Vary` (п. 41).
      **AC:** тести: `Accept-Encoding: br` → `.br` з `Content-Encoding: br`; `gzip` → `.gz` з `Content-Encoding: gzip`; без заголовка — оригінал без `Content-Encoding`; у всіх трьох — `Vary: Accept-Encoding`; файл без `.br`/`.gz` поруч — оригінал.
- [ ] **F14.D** Шаблон D: `caching.md`, `configuration.md`. **F14.E**, **F14.X**.

## Хвиля 7 — пакети і фронтенд (паралельно, після F00)

### F15 Shared Cleanup (п. 56, 57, 58)

- [ ] **F15.S** Шаблон S.
- [ ] **F15.1** Тести shared: enums мов, `utils/phone`, `isWsChannel`, ключові схеми; порожній `languages.test.js` замінено (п. 56).
      **AC:** `pnpm --filter shared test` — ≥ 1 реальний тест на кожен модуль.
- [ ] **F15.2** `guards`: реекспорт у `src/index.ts` або підшлях задокументовано, відповідно до фактичних імпортів (п. 57).
      **AC:** імпорт з обраного шляху компілюється в backend.
- [ ] **F15.3** `EntityIdSchema.brand('EntityId')`; виправити використання (п. 58).
      **AC:** `// @ts-expect-error` тест на передачу plain string.
- [ ] **F15.D** Шаблон D: `documentation/shared` (тести, guards, брендовані id). **F15.E**, **F15.X**.

### F16 Frontend & Playground (п. 59, 61, 62, 63, 64)

- [ ] **F16.S** Шаблон S.
- [ ] **F16.1** Fallback `VITE_BASE_URL` → відносний шлях (п. 59).
      **AC:** dev без змінної — запити через proxy (DevTools, evidence).
- [ ] **F16.2** Типізація всіх `VITE_*` в `env.d.ts`; чистка `main.ts` (п. 61).
      **AC:** звертання до неіснуючої `VITE_*` — помилка typecheck.
- [ ] **F16.3** Playground: шлях doc-маршрутів з `baseUrl`/`API_PATH_PREFIX`, proxy з тієї ж змінної (п. 62).
      **AC:** з `API_PATH_PREFIX=v1` список маршрутів завантажується.
- [ ] **F16.4** `https`→`wss`, `http`→`ws` (п. 63).
      **AC:** unit на обидва перетворення.
- [ ] **F16.5** `sendMessage` без з'єднання → помилка «not connected», без «message queued» (Р4, п. 64).
      **AC:** unit.
- [ ] **F16.6** Follow-up feat-009: `/health` у playground.
      **AC:** маршрут видно і викликається.
- [ ] **F16.D** Шаблон D: `documentation/frontend`, `documentation/playground` (`VITE_*`, префікс, `/health`). **F16.E** (з e2e), **F16.X**.

## Хвиля 8 — схема і суворі правила

### F17 Drop `users.is_admin` (п. 66, Р5)

- [ ] **F17.S** Шаблон S.
- [ ] **F17.1** Інформаційний запит розбіжностей `is_admin` / `role` на dev-БД.
      **AC:** число в `progress.md` і описі PR.
- [ ] **F17.2** Прибрати всі звертання до `isAdmin` у коді (схема лишається), окремий коміт.
      **AC:** `grep isAdmin` — лише метод стору фронтенду, що читає `role`; тести зелені.
- [ ] **F17.3** → F17.2. Міграція `DROP COLUMN is_admin`; схема.
      **AC:** `drizzle-kit check` чистий; міграція на БД з `db:seed --demo` успішна; вхід адміна працює.
- [ ] **F17.D** Шаблон D: `database.md`; нотатка про незворотність у PR. **F17.E**, **F17.X**.

### F18 ESLint Strict (п. 68) → F01

- [ ] **F18.S** Шаблон S.
      Кожен із трьох PR проходить повний DoD (шаблон E: typecheck, lint, test, e2e для frontend/playground, evidence-блок у `progress.md` окремо для PR); статус `done` (X) — лише після третього.

- [ ] **F18.1** Backend: увімкнути вимкнені правила `strictTypeChecked`, виправити; свідомо вимкнені — з коментарем-причиною. Окремий PR.
      **AC:** шаблон E для PR; `pnpm lint` зелений; тести без змін; список вимкнених правил у evidence.
- [ ] **F18.2** → F18.1. Frontend — те саме, окремий PR.
      **AC:** шаблон E для PR (з e2e); список вимкнених правил у evidence.
- [ ] **F18.3** → F18.2. api-playground — те саме, окремий PR.
      **AC:** шаблон E для PR; список вимкнених правил у evidence.
- [ ] **F18.X** після F18.3: п. 68 позначено виправленим з посиланням на три PR; статус `done`.

---

## Підсумок

- [ ] **Z.1** Після останньої фічі: таблиця «Стан» у `code-issues-found-during-docs.md` покриває всі 49 пунктів; п. 55 — «Відкладено»; винесені пункти (F05.6, F09.4) мають номери.
      **AC:** у таблиці «Зведення» немає відкритих пунктів, крім відкладених і нових.
- [ ] **Z.2** Roadmap і цей task list — рядок статусу «виконано» з посиланнями на PR.
