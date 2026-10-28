# План: прибирання внутрішніх документів (п. 15)

Пункт 15 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Фіча: **feat-009 «Internal Docs Cleanup»**, обсяг розширено (варіант 1): крім backend-документів з п. 15 — `api-playground`, frontend, статуси планів у `docs/plan/`, `AGENTS.md`.

«Внутрішні» — усі `.md` поза `documentation/`. Публічний сайт `documentation/` підтримується окремо і тут змінюється лише там, де посилається на документи, що видаляються або переносяться.

## Проблема

Аудит (2026-10-23, `main` після feat-008) звірив ~60 файлів із кодом. Більшість внутрішніх документів писалися як плани чи нотатки й не оновлювалися після реалізації: вони описують код, якого немає, або дублюють сторінки `documentation/`, які вже правильні. Читач (людина чи агент) не може відрізнити такий документ від актуального.

Що в самому п. 15 вже неточне:

- `SECURITY_ANALYSIS.md`: за аудитом коду **всі 15** findings виглядають виправленими, включно з C-2 і L-4 (у п. 15 — «C-2, M-5 частково; L-4 відкритий»). Це поки твердження з читання коду, а не перевірений факт: крок 4 будує простежувану відповідність, і лише після неї finding вважається закритим.
- Кореневий `README.md`: `documentation/` у дереві вже є; застаріло інше (див. нижче).
- «Drift-список» у `packages/backend/README.md` не існує; застарілі конкретні місця README.

## Принципи

1. **Один актуальний опис.** Якщо тема вже описана на сторінці `documentation/` за поточним кодом, внутрішній дублікат видаляється, а не оновлюється. Корисне, чого на сайті немає, переноситься туди.
2. **Виконані плани не видаляються, а позначаються.** План — історія рішень; йому додається рядок статусу на початку, текст не переписується.
3. **Рішення архітектури — ADR.** Нова тека `docs/adr/` для рішень, на які посилається код чи документація.
4. **Посилання не ламаються — з явними винятками.** Кожне видалення чи перенесення супроводжується `git grep` і виправленням посилань у **живих** документах: `documentation/`, README, `AGENTS.md`, `.github/workflows/docs.yml`, `feature_list.json` (лише через PR у `main`). Винятки, де посилання свідомо не правляться (повний список — «Дозволені залишки» в кроці 10):
    - **історичні плани** в `docs/plan/` зі статус-рядком «виконано»: вони описують стан на момент написання, статус-рядок це пояснює;
    - **тестові фікстури** — рядки-шляхи, які не є посиланнями (`documentation/scripts/verify/lib.test.mjs`).
5. **Важливі джерела історії — через permalink на коміт.** Коли живий документ посилається на видалений файл як на джерело (ADR → початковий план валідатора; статус security-аудиту → початковий аудит), посилання веде на `https://github.com/Blazheiko/vibe-template/blob/<sha>/<path>` останнього коміту, де файл існував, а не на `main`.

## Рішення по документах

Шляхи backend відносно `packages/backend/`.

### Backend

| Документ                                 | Рішення                                                                                  | Деталі                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/docs/SESSION_SECURITY.md`           | **видалити**                                                                             | TTL 2h (код 24h, `config/session.ts`), `sameSite: Strict` (код `Lax`), формат `userId.sessionId` (код `userToken.sessionId.signature`), немає `__Host-` і CSRF. Актуально описано в `documentation/backend/auth-security.md` («Формат cookie», CSRF). Перед видаленням звірити: усе, що в документі правильне й корисне, на сторінці є                                                                                                                                                                                                     |
| `src/vendor/start/SECURITY_ANALYSIS.md`  | **перенести** → `docs/security/security-analysis-status.md` після простежування (крок 4) | не видаляємо, доки кожен finding не має доказів. Новий файл — таблиця `ID → суть → стан → виправлення (коміт / PR) → перевірка (тест або код file:line)`, плюс permalink на початковий аудит (принцип 5). Finding, для якого не знайдено коміту **і** перевірки, лишається «не підтверджено», а не «закрито». Початковий файл видаляється, коли таблиця готова. `documentation/backend/auth-security.md` отримує одне речення з посиланням на таблицю                                                                                      |
| `src/docs/etag-improvements.md`          | **видалити**                                                                             | описує ETag «довжина + URL»; зараз SHA1 content hash (`vendor/start/static-server.ts`), обґрунтування — у коментарі там же. `documentation/backend/caching-etag.md` прибирає абзац про цей файл                                                                                                                                                                                                                                                                                                                                            |
| `src/docs/VALIDATOR_ABSTRACTION_PLAN.md` | **ADR** → `docs/adr/0001-validator-abstraction.md`                                       | короткий ADR: контекст, рішення (`Validator<T>` у `vendor/contracts/validator.ts`, ArkType-адаптер в `app/validate`), наслідки, що свідомо лишається прив'язаним до ArkType (type-only імпорти в `define-route.ts`, `serialize-routes.ts`). Початковий план не переносимо — ADR посилається на нього permalink'ом на коміт (принцип 5). Крок 10 плану (нотатка «один валідатор» у README) — у `documentation/backend/validation.md`, а не в README. `validation.md` посилається на ADR                                                     |
| `src/docs/HTTP_BODY_LIMITS_PLAN.md`      | **перенести** → `docs/plan/http-body-limits-original-plan.md`                            | виконаний план; статус уже є на початку, доповнити: формат 413, «тіло без `Content-Type`», PATCH/DELETE, `onAborted` замінено — див. `documentation/backend/request-lifecycle.md`. Тека `src/docs/` після цього порожня й зникає                                                                                                                                                                                                                                                                                                           |
| `src/vendor/directory-structure.md`      | **видалити**                                                                             | 4 неіснуючі файли, бракує 9 тек; ручний список структури швидко застаріває. Опис шарів `vendor/` є в `documentation/backend/architecture.md` — перевірити, що там згадано `contracts/`, `start/`, `utils/validation`, `utils/rate-limit`; додати, якщо ні                                                                                                                                                                                                                                                                                  |
| `src/scripts/README.md`                  | **переписати** (5–10 рядків)                                                             | лише наявні скрипти з `package.json`, що лежать у `src/scripts/`: що робить, як запустити (`pnpm --filter backend …`). Без nodemon, без `copy:static`/`export-types`                                                                                                                                                                                                                                                                                                                                                                       |
| `src/scripts/export-types.js`            | **видалити**                                                                             | немає в `package.json`, читає неіснуючий `app/controllers/http/types/index.d.ts` — мертвий код. Перевірити `git grep export-types` перед видаленням                                                                                                                                                                                                                                                                                                                                                                                        |
| `packages/backend/README.md`             | **оновити**                                                                              | схема обробки запиту: `ValidationError → 400` → **422**; шлях rate limit → `src/vendor/utils/rate-limit/http-rate-limit.ts`; додати крок валідації query і L1-ліміт; зміни feat-008 (PATCH читає тіло, `validator` на GET/DELETE заборонено, 204 для порожнього payload, 415 без `Content-Type` з framing, строгий `parseSize`) — коротко, з посиланнями на `documentation/backend/request-lifecycle.md`; у таблиці команд — `test:redis`, `db:create:prod`. «Drift-список» не створюємо: його немає, а розбіжності виправляються на місці |

### Кореневі та `AGENTS.md`

| Документ    | Рішення                                                                                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md` | рядок 334: `pnpm --filter backend db:create db:migrate` → дві команди через `&&` (зараз запускається лише `db:create`); у таблицю команд — `docs:dev`, `docs:build`, `docs:preview`, `docs:verify`, `prod:local` |
| `AGENTS.md` | рядок про Drizzle: «схема й relations — `src/database`, create/seed — `src/db`, міграції — `src/drizzle/migrations`»; прибрати хибне «This checkout does not include `.git` history»                             |

### `api-playground`

Єдине джерело — `documentation/playground/index.md`. Порт dev — 5174, менеджер — pnpm, змінна — `VITE_API_BASE_URL`.

| Документ                                                         | Рішення                                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                                      | **скоротити** до 10–15 рядків: що це, `pnpm --filter api-playground dev` (порт 5174), посилання на `documentation/playground/`  |
| `docs/API-DOCUMENTATION.md`                                      | **видалити** (`ApiFilters.vue`, `stores/api.ts`, `useApiStore` не існують; дублікат)                                            |
| `docs/CORS-SOLUTION.md`                                          | **видалити** (рішення для Express; у dev — Vite proxy на `:3000`). Один абзац про proxy — в `index.md`, якщо його там немає     |
| `docs/TESTING-NAVIGATION.md`                                     | **видалити** (одноразова нотатка про виправлення)                                                                               |
| `docs/NAVIGATION-STRUCTURE.md`                                   | **злити** короткий розділ «Будова інтерфейсу» (три колонки, компоненти `navigation/*`) в `index.md`, видалити                   |
| `docs/TROUBLESHOOTING.md`                                        | **злити** корисні перевірки (backend не запущено, `VITE_API_BASE_URL`, `DOC_PAGE`/`APP_ENV=manual-test`) в `index.md`, видалити |
| `docs/WEBSOCKET-USAGE.md`                                        | **злити** короткий розділ про `WebSocketModal` / `TestFormWs` / `useWebSocketConnection` і `/ws` proxy в `index.md`, видалити   |
| `QUICK-WINS.md`, `docs/API-TESTING-IMPROVEMENTS.md`              | **видалити** (побажання, нічого не реалізовано). Відкриті ідеї, якщо вони ще потрібні, — у `docs/ROADMAP.md` одним рядком кожна |
| `docs/ROADMAP.md`                                                | **залишити**, позначити на початку «нотатка, не опис поведінки»                                                                 |
| `docs/UI-UX-ANALYSIS.md`                                         | **залишити**, та сама позначка                                                                                                  |
| `test-ws-server.js`, `ws-test-server.js`, `test-navigation.html` | **видалити** (порожні / 1 байт, ніде не використовуються)                                                                       |

`documentation/playground/index.md` уже називає `docs/` внутрішніми чернетками; після прибирання там лишаються лише `ROADMAP.md` і `UI-UX-ANALYSIS.md` — формулювання уточнити.

Скрипт `test` для `api-playground` **не додаємо**: тестів у пакеті немає, а порожній скрипт створив би хибне враження. У `index.md` уже сказано, що тестів немає; п. 15 позначити як «свідомо».

### Frontend

| Документ                                   | Рішення                                                                                                                                                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/frontend/README.md`              | прибрати bullet «News / notes» (`News.vue`, `NewsDetail.vue`, `CreateNews.vue` не існують) і згадку «news» у views                                                                                                                                  |
| `src/composables/README.md`                | **переписати розділ `useWebSocketConnection`** за поточним API: без аргументів, `statusWebSocket`, `websocketOpen(url, token)`, без `resetWebSocketConnection()`, приклад з `App.vue` без колбеків. Решту composables звірити з `src/composables/*` |
| `src/composables/SINGLETON_EXPLANATION.md` | **злити** суть (чому composable — singleton на рівні модуля) одним розділом у `composables/README.md`, видалити. `ChatComponent.vue` і колбеки — прибрати                                                                                           |

### `docs/plan/`

| Що                                                                                                                                                                                                                                                                                          | Рішення                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| виконані плани (12 файлів: `csp-fix-plan`, `ws-upgrade-rate-limit-plan`, `db-seed-plan`, `http-body-methods-plan`, `http-null-payload-plan`, `http-body-limits-plan`, `redis-rate-limit-plan`/`-tasks`, `redis-main-client-timeout-plan`/`-tasks`, `vitepress-documentation-plan`/`-tasks`) | рядок на початку: `> **Статус:** виконано у feat-XXX (PR #NN, YYYY-MM-DD).` Номери PR і дати — з `feature_list.json` (`evidence`) і `git log`. Чекбокси в tasks-файлах **не** відмічаємо заднім числом: статус-рядок говорить, що файл — історія. Невиконаний пункт, якщо він свідомо лишився (`redis-rate-limit-tasks` — 1 з 40, `csp-fix-plan` DoD), — назвати в статус-рядку |
| `dependency-upgrade-plan.md`                                                                                                                                                                                                                                                                | статус: етапи 0, A–G виконано; етап H (Drizzle 1.0 stable) відкритий свідомо                                                                                                                                                                                                                                                                                                    |
| `code-issues-found-during-docs.md`                                                                                                                                                                                                                                                          | рядок 3 («нічого не виправлено») замінити на підсумок; таблиця «пункт → статус → фіча» на початку (виправлено: 6, 7, 10–15 тощо — за наявними позначками «Виправлено» у файлі); п. 15 позначити виправленим із посиланням на цей план                                                                                                                                           |
| `internal-docs-cleanup-plan.md` (цей)                                                                                                                                                                                                                                                       | статус після злиття                                                                                                                                                                                                                                                                                                                                                             |

### Не змінюємо

`docs/requirements/**`, `docs/reference/**`, `docs/screenshots/README.md` — актуальні (вибірково перевірені шляхи, змінні, ендпоінти, скриншоти). `progress.md` / `session-handoff.md` — робочі файли фіч.

## Кроки

1. **PR у `main`** (`chore/feat-009-start`): `feature_list.json` — feat-009 `in_progress`, `owner`, `branch: feat/internal-docs-cleanup`, `description` розширено до обсягу цього плану (backend + `api-playground` + frontend + статуси `docs/plan` + `AGENTS.md`).
2. **Гілка `feat/internal-docs-cleanup`**, цей план комітиться першим.
3. **Перед кожним видаленням / перенесенням:** `git grep -n <ім'я файлу>` і виправлення всіх посилань. Відомі зараз:
    - `documentation/backend/caching-etag.md` → `etag-improvements.md`;
    - `documentation/backend/validation.md` → `VALIDATOR_ABSTRACTION_PLAN.md` (замінити на ADR);
    - `documentation/backend/request-lifecycle.md` → `HTTP_BODY_LIMITS_PLAN.md`; абзац (рядок ~182) ще каже, що тести, `.env.example` і playground «не зроблено» — після feat-008 це неправда, переписати;
    - `documentation/playground/index.md` → `ROADMAP`, `UI-UX-ANALYSIS`;
    - `packages/api-playground/README.md` → `API-DOCUMENTATION`, `API-TESTING-IMPROVEMENTS`, `ROADMAP`;
    - `.github/workflows/docs.yml` `paths`: `packages/backend/src/docs/**`, `src/vendor/directory-structure.md`, `src/vendor/start/*.md` — прибрати шляхи, які зникли; додати `docs/adr/**`, якщо сайт на нього посилається;
    - `docs/plan/vitepress-documentation-*.md`, `csp-fix-plan.md` — історичні плани: посилання не правимо, статус-рядок пояснює, що шляхи могли змінитися;
    - `feature_list.json` (description feat-009 тощо) — лише в PR кроку 1 або в done-PR;
    - `documentation/scripts/verify/lib.test.mjs` згадує `SECURITY_ANALYSIS.md` як рядок-фікстуру — не змінюється.
4. **Простежування security-аудиту** (до видалення `SECURITY_ANALYSIS.md`). Для кожного з 15 findings:
    - **виправлення:** коміт і, якщо є, PR — через `git log -S'<ключовий фрагмент коду>'` / `git log -L` по місцю виправлення і `gh pr list --search <sha>`;
    - **перевірка:** тест, що падає без виправлення (назва spec-файлу й тесту), або, якщо тесту немає, — код `file:line` з поміткою «без тесту»;
    - **стан:** «закрито» — є виправлення і перевірка; «закрито, без тесту» — є виправлення, перевірка лише кодом; «не підтверджено» — не вдалося знайти.

    Результат — `docs/security/security-analysis-status.md`. Findings «закрито, без тесту» і «не підтверджено» перелічуються в `progress.md`; нові тести для них — поза обсягом (окрема фіча), але список стає її входом.

5. **Backend** (таблиця вище), окремими комітами: видалення; ADR; перенесення body-limits плану; `scripts/README.md`; `README.md`.
6. **Корінь і `AGENTS.md`.**
7. **`api-playground`**: злиття в `documentation/playground/index.md`, потім видалення.
8. **Frontend.**
9. **`docs/plan/`**: статус-рядки, підсумок у `code-issues-found-during-docs.md`.
10. **Перевірка:**

- `git grep` на кожне видалене чи перенесене ім'я файлу. **Дозволені залишки** (усе інше — помилка):
    - історичні плани в `docs/plan/` зі статус-рядком «виконано» (зокрема `vitepress-documentation-*`, `csp-fix-plan`, `http-body-limits-plan`) і цей план;
    - `docs/plan/code-issues-found-during-docs.md` (п. 15 описує, що було);
    - тестова фікстура `documentation/scripts/verify/lib.test.mjs` (рядок `SECURITY_ANALYSIS.md`);
    - permalink'и на коміт (`/blob/<sha>/…`) за принципом 5;
    - `feature_list.json`, якщо PR кроку 1 ще не прибрав старі назви з `description`;
- `pnpm docs:build && pnpm docs:verify` — внутрішні посилання й anchors сайту. **Зовнішні URL `docs:verify` пропускає** (`classifyUrl` у `documentation/scripts/verify/lib.mjs`), тож окремо:
- **GitHub-посилання на файли репозиторію.** Одноразовий Node-скрипт (у scratchpad, не комітиться) знаходить у всіх `.md` репозиторію (`documentation/`, `docs/`, `packages/**`, корінь) посилання `https://github.com/Blazheiko/vibe-template/blob/main/<path>` і `/tree/main/<path>`, відкидає `#L…`, і перевіряє, що `<path>` існує в робочому дереві гілки. Без мережі: те, що буде на `main` після злиття, — це дерево гілки. Permalink'и на коміт перевіряються через `git cat-file -e <sha>:<path>`. Скрипт застосовує **ті самі винятки**, що й «Дозволені залишки» вище, з одного списку в самому скрипті: биті посилання у файлах-винятках (історичні плани зі статус-рядком, цей план, `code-issues-found-during-docs.md`) виводяться окремо як «дозволені» з причиною, але не рахуються порушеннями. Тестова фікстура не є посиланням і скрипт її не бачить. Умова злиття — **нуль непогоджених порушень**: будь-яке бите посилання поза списком винятків, а також виняток, якого немає в списку, — помилка. Вивід (порушення, дозволені з причиною, кількість перевірених посилань) — у `progress.md`;
- `pnpm typecheck`, `pnpm lint`, `pnpm test` — код не змінюється, крім видалення `export-types.js`, але `AGENTS.md` вимагає;
- **відносні посилання** в `.md` поза `documentation/` (`](./…)`, `](../…)`) — тим самим скриптом: шлях резолвиться від теки файлу й має існувати;
- команди з переписаних README (`scripts/README.md`, `api-playground/README.md`, кореневий рядок 334) запустити вручну.

## Поза обсягом

- Зміни коду, крім видалення мертвого `export-types.js`.
- Нові сторінки `documentation/` понад злиття розділів у `playground/index.md` і абзаци в `auth-security.md`, `architecture.md`, `validation.md`.
- Переклад внутрішніх документів (частина англійською, частина російською — лишаються як є).
- Реалізація ідей з `ROADMAP.md` / видалених wishlist-файлів.
- Тести для `api-playground`.
- П. 16 (стиль коду / Prettier) — feat-010.

## Прийняті рішення

- Дублікати публічних сторінок видаляються, а не оновлюються; корисне переноситься в `documentation/`.
- Виконані плани лишаються з рядком статусу; чекбокси заднім числом не відмічаються.
- `VALIDATOR_ABSTRACTION_PLAN.md` → `docs/adr/0001-validator-abstraction.md`.
- `src/docs/` зникає: два файли видаляються, ADR і план лімітів переходять у `docs/`.
- `SECURITY_ANALYSIS.md` видаляється лише після таблиці простежування в `docs/security/`; «закрито» означає наявність виправлення і перевірки.
- Посилання в живих документах правляться; виняток — історичні плани й тестові фікстури, перелічені явно. Джерела історії — permalink на коміт.
- Зовнішні GitHub-посилання на файли репозиторію перевіряються окремим скриптом, бо `docs:verify` їх пропускає.
- `api-playground` лишає `README.md` (короткий), `docs/ROADMAP.md`, `docs/UI-UX-ANALYSIS.md`; скрипт `test` не додається.
