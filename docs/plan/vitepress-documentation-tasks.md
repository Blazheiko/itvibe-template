# Task list: документація itvibe на VitePress

> **Статус:** виконано у feat-003 (PR #2, 2026-10-19) і feat-011 (PR #9–#18, 2026-10-20). Чекбокси нижче не відмічено заднім числом: evidence — у `feature_list.json`. Документи з `packages/backend/src/docs/` і `SECURITY_ANALYSIS.md` у feat-009 видалено або перенесено.

Джерело: [vitepress-documentation-plan.md](./vitepress-documentation-plan.md) (ревізія 3).
Кожна задача — атомарна (≤ 0.5 дня), з критерієм приймання (**AC**). Порядок — послідовний, якщо
не вказано інше; `→` — залежність.

---

## Етап 0 — Підготовка

- [ ] **T0.1** PR у `main`: додати в `feature_list.json` запис `feat-XXX vitepress-documentation`
      (`owner`, `branch: feat/vitepress-docs`, `status: in_progress`, `dependencies: []`).
      **AC:** PR змерджено, рядок `in_progress`.
- [ ] **T0.2** У тому ж PR — запис `feat-YYY openapi-generation` (`status: not-started`).
      **AC:** запис присутній у `main`.
- [ ] **T0.3** → T0.1. Створити гілку `feat/vitepress-docs`, оновити `progress.md` (мета, план,
      посилання на цей task list), прогнати `./init.sh`.
      **AC:** `init.sh` зелений, `progress.md` закомічено.

## Етап 1 — Мінімальний каркас

- [ ] **T1.1** Створити `documentation/package.json` (`name: documentation`, `private`, `type: module`;
      scripts `docs:dev`, `docs:build`, `docs:preview`, `docs:verify`, `typecheck`).
      Додати `vitepress@^1`, `vitepress-plugin-mermaid`, `mermaid` як devDependencies.
      **AC:** `pnpm install` без peer-warning для `vue`; якщо warning є — додати `vue@^3.5.44`.
- [ ] **T1.2** Додати `- 'documentation'` у `pnpm-workspace.yaml`; кореневі скрипти
      `docs:dev`, `docs:build`, `docs:verify` (`pnpm --filter documentation …`).
      **AC:** `pnpm docs:dev` стартує з кореня.
- [ ] **T1.3** `.vitepress/config.ts`: `base: '/vibe-template/'`, `lang: 'uk-UA'`, `title`,
      `cleanUrls: true`, `lastUpdated: true`, `ignoreDeadLinks: false`, `search.provider: 'local'`,
      `editLink`, `socialLinks`, обгортка `withMermaid`; порожні `nav`/`sidebar` за розділами.
      **AC:** `docs:build` зелений.
- [ ] **T1.4** `.vitepress/theme/index.ts` (extends DefaultTheme) + `custom.css`.
      **AC:** тема підхоплюється, стилі застосовуються.
- [ ] **T1.5** `documentation/tsconfig.json` (extends `../tsconfig.base.json`,
      `include: [".vitepress/**/*.ts", ".vitepress/**/*.vue"]`, `types: ["vitepress/client"]`); скрипт `typecheck` (`tsc --noEmit` або `vue-tsc --noEmit`).
      **AC:** `pnpm --filter documentation typecheck` зелений; `pnpm -r typecheck` його включає.
- [ ] **T1.6** Ігнори: `documentation/.vitepress/{cache,dist}` у `.gitignore`, `.prettierignore`,
      `eslint.config.ts`; переконатися, що `projectService` знаходить новий `tsconfig.json`.
      **AC:** `pnpm lint`, `pnpm format:check` зелені.
- [ ] **T1.7** Smoke-контент: `index.md` (layout home), одна сторінка з Mermaid-блоком, одним
      `<!--@include-->` (напр. `packages/backend/src/scripts/README.md`) і картинкою з `public/`.
      **AC:** у `docs:dev` і `docs:preview` Mermaid рендериться, include видно, картинка під base.
- [ ] **T1.8** Приймання каркаса: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm docs:build`.
      **AC:** усе зелене; результат записано в `progress.md`; коміт `docs: scaffold VitePress site`.

## Етап 2 — Перевірка відрендереного контенту (`docs:verify`)

> Робиться до контенту, щоб кожна наступна сторінка одразу перевірялась.

- [ ] **T2.1** `documentation/scripts/verify-dist.mjs`: каркас — обхід `dist/**/*.html`, парсинг
      (напр. `node-html-parser` як devDependency), вибір контейнера `.vp-doc`, збір помилок, ненульовий exit-код.
      **AC:** `docs:verify` запускається і проходить на smoke-контенті.
- [ ] **T2.2** Перевірка include: знайти всі `<!--@include: path-->` у `*.md`, перевірити існування
      файлу; у `.vp-doc` цільової сторінки — заголовок фрагмента **і** характерний рядок тексту
      (перший `#`-заголовок + перший непорожній абзац, або явна мапа маркерів).
      **AC:** видалення/перейменування включеного файлу → `docs:verify` падає.
- [ ] **T2.3** Перевірка ключових сторінок за списком у конфігурації скрипта. Список **наповнюється
      поступово**: на старті — лише smoke-сторінка; кожна стаття етапів 4/6 додається до списку в
      тій самій задачі, де її написано. Для статті: існує в `dist`, `.vp-doc` має очікуваний `h1` і
      ≥ 300 символів тексту **без урахування заголовків** (`h1`–`h6`).
      **AC:** smoke-сторінка проходить; її спорожнення (лише `h1`) → падіння.
- [ ] **T2.3a** Окремий критерій для `index.md` (`layout: home`, без `.vp-doc`): присутні hero
      (`.VPHero` з очікуваним `name`/`tagline`) і action-посилання, що ведуть на існуючі сторінки.
      **AC:** видалення hero або бите посилання з hero → падіння.
- [ ] **T2.4** Перевірка URL (`src`/`href`/`srcset`):
      виключити `http(s)://`, `//`, `mailto:`, `tel:`, `data:`, `javascript:`, чисті `#anchor`;
      локальні ресурси — префікс `/vibe-template/` + файл існує в `dist`;
      внутрішні сторінки — префікс + `x.html` або `x/index.html` (cleanUrls) + `#id` існує на цільовій сторінці.
      **AC:** юніт-кейси (або фікстура) для кожного класу URL; зламаний ресурс/якір → падіння.
- [ ] **T2.5** Перевірка Mermaid: кількість mermaid-блоків у джерелі = кількість контейнерів плагіна в `.vp-doc`.
      **AC:** проходить на smoke-сторінці.

## Етап 3 — CI/CD

- [ ] **T3.1** → T2.5. Створити `.github/workflows/docs.yml` за планом (§5, етап 3): тригери
      `pull_request` / `push: main` / `workflow_dispatch` зі спільним якорем `&docs_paths`; job `build`
      (checkout `fetch-depth: 0`, pnpm, node з `.nvmrc`, `install --frozen-lockfile`, `typecheck`,
      `docs:build`, `docs:verify`).
      **AC:** файл валідний (`actionlint` без помилок); запуск на PR — у T3.4.
- [ ] **T3.2** → T3.1. Upload artifact і job `deploy` з умовою
      `github.ref == 'refs/heads/main' && github.event_name != 'pull_request'`;
      `permissions` для `deploy`: `pages: write`, `id-token: write`.
      **AC:** `actionlint` без помилок; обидва кроки мають однакову умову.
- [ ] **T3.3** → T3.1. Перевірка джерел include vs CI-тригери в `verify-dist.mjs`: скрипт читає
      `paths` з `docs.yml` і перевіряє, що кожен include-шлях ними покривається.
      **AC:** include з файлу поза списком → `docs:verify` падає локально.
- [ ] **T3.4** → T3.2, T3.3. Відкрити draft PR: workflow запускає build і проходить; deploy пропущено.
      **AC:** посилання на запуск у `progress.md`.
      _(Ручний `workflow_dispatch` тут перевірити неможливо: GitHub вимагає наявності workflow у
      default branch — перевірка перенесена в T5.3a.)_
- [ ] **T3.5** (власник репо, вручну) **Settings → Pages → Source: GitHub Actions**.
      **AC:** налаштування збережено.

## Етап 4 — Контент v1

> Кожна сторінка: читання коду → текст із посиланнями на файли → додати в `sidebar` і в список
> ключових сторінок `verify-dist` → `docs:build && docs:verify`. Плани з `src/docs` — тільки з
> позначкою `::: warning План`.
>
> **Загальне приймання для кожної задачі етапів 4 і 6:**
>
> - сторінку додано в `sidebar` і в список перевірки T2.3; `docs:build && docs:verify` зелені;
> - у прикладах конфігурації — **лише плейсхолдери**, жодних реальних секретів/ключів/хостів;
> - код застосунку та `.env.example` **не змінюються** (розбіжності лише документуються).

- [ ] **T4.0** Класифікувати наявні документи (таблиця §3 плану): прочитати кожен, звірити з кодом,
      записати фінальний статус у `progress.md`.
      **AC:** для кожного документа статус + дія (include / перенос / «План» / не публікувати).
- [ ] **T4.1** `guide/introduction.md` (з README) і `guide/project-structure.md` (пакети, alias-и `#app/*` тощо).
- [ ] **T4.2** `guide/getting-started.md`: Node 24 (`.nvmrc`), pnpm, PostgreSQL, Redis (docker-compose-приклад),
      `.env` з `.env.example`, `db:create`, `db:migrate`, `db:seed`, `pnpm dev`.
      **AC:** інструкцію пройдено на чистому clone з порожньою БД; лог записано в `progress.md`.
- [ ] **T4.3** Інвентаризація env: `grep` по `process.env` / env-хелперу (`vendor/utils/env`),
      `src/config/*.ts`, drizzle config → таблиця (змінна, призначення, default, обов'язковість, файл).
      **AC:** **набір назв** змінних у таблиці дорівнює набору унікальних назв, знайдених у коді
      (порівняння множин, напр. `comm`/скриптом — без зайвих і без пропущених).
- [ ] **T4.4** `backend/configuration.md` з таблиці T4.3 + блок «Розбіжності з `.env.example`»
      (`APP_UNIX_PATH`/`UNIX_PATH`, `DATABASE_URL`, `REDIS_*`, `APP_MAX_*_BODY_SIZE`, `API_PATH_PREFIX`, `CDN_URL`).
- [ ] **T4.5** `backend/index.md` — огляд і стек.
- [ ] **T4.6** `backend/architecture.md` — шари route → middleware → controller → service →
      repository → transformer, Mermaid-схема, приклад одного реального запиту.
- [ ] **T4.7** `backend/request-lifecycle.md` — `vendor/start/server.ts`, `router.ts`, body limits,
      валідація, помилки; Mermaid sequence (HTTP і WS upgrade).
- [ ] **T4.8** `backend/routing-middlewares.md` — `http-routes.ts`, `ws-routes.ts`, групи/префікси,
      `kernel.ts`, `csrf-guard`, `admin-guard`, як написати власний middleware; `serialize-routes.ts`,
      `DOC_PAGE`, `dev:manual_test` + `api-playground`.
- [ ] **T4.9** `backend/database.md` — Drizzle `1.0.0-rc.4`, `drizzle/schema`, `defineRelations`
      (`database/relations.ts`), folder-per-migration, `db:*` скрипти, seed.
- [ ] **T4.10** `backend/auth-security.md` — сесії, cookies, OAuth (arctic), email/SMS, throttling,
      CSRF, CSP, CORS, rate-limit, trust proxy (на базі `SESSION_SECURITY.md`, `SECURITY_ANALYSIS.md` після звірки).
- [ ] **T4.11** `backend/adding-a-feature.md` — наскрізний приклад нового ресурсу (repository →
      transformer → service → controller → route → shared schemas).
      **AC:** приклад реально виконано в тимчасовій гілці, `pnpm typecheck && pnpm --filter backend test`
      зелені, зміни відкочено; результат у `progress.md`.
- [ ] **T4.12** `reference/scripts.md` — усі pnpm-скрипти кореня і пакетів.
- [ ] **T4.13** `nav`/`sidebar` фінальні для v1; hero `index.md` з посиланнями на розділи.
      **AC:** `docs:build && docs:verify` зелені, усі сторінки v1 у списку перевірки, hero перевіряється T2.3a.

## Етап 5 — Реліз v1

- [ ] **T5.1** Повний прогін: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm docs:build && pnpm docs:verify`.
      **AC:** зелено; вивід у **Evidence of Completion** у `progress.md`.
- [ ] **T5.2** PR `feat/vitepress-docs` → `main` (опис, перевірки, скриншоти сайту).
      **AC:** CI build на PR зелений, deploy пропущено.
- [ ] **T5.3** → T3.5, T5.2. Merge → перевірити успішний deploy-job.
- [ ] **T5.3a** → T5.3. Коли `docs.yml` уже в `main`: ручний `workflow_dispatch` з будь-якої
      не-`main` гілки — build проходить, upload і deploy пропущено.
      **AC:** посилання на запуск у `progress.md`.
- [ ] **T5.4** Ручна перевірка на Pages (результати в `progress.md`):
      пряме відкриття й перезавантаження `/vibe-template/backend/configuration` (без 404);
      пошук українською («міграції», «сесія»); Mermaid рендериться в SVG без помилок у консолі;
      картинки під `/vibe-template/`; dark/light теми.
- [ ] **T5.5** Одразу після T5.4 — посилання та бейдж документації в `README.md` (окремий PR).
- [ ] **T5.6** Правило в `AGENTS.md`: зміна route/env/middleware/міграцій → оновлення сторінки в `documentation/backend/`.
- [ ] **T5.7** PR у `main`: `feature_list.json` → `done` з посиланням на evidence-коміт.

## Етап 6 — v2 (інкрементально, окремі PR)

Кожна задача = **одна сторінка = один PR**, той самий цикл (код → сторінка → sidebar →
verify-список → CI) і загальне приймання з етапу 4.

- [ ] **T6.1** `backend/controllers-services.md`
- [ ] **T6.2** `backend/repositories-transformers.md`
- [ ] **T6.3** `backend/validation.md` (фактичний `app/validate`; `VALIDATOR_ABSTRACTION_PLAN` — лише як «План»)
- [ ] **T6.4** `backend/websocket.md` (coordinator, connection-registry, session-auth, events, heartbeat)
- [ ] **T6.5a** `backend/storage.md` (S3/MinIO, `config/disk.ts`, presigned URLs)
- [ ] **T6.5b** `backend/mail-push.md` (SMTP, web push, `mail:test`)
- [ ] **T6.5c** `backend/ai.md` (xAI, Mistral, ai-sdk)
- [ ] **T6.6** `backend/observability.md` (logger, Sentry, `GET /api/ping`)
- [ ] **T6.7** `backend/caching-etag.md` (поточна поведінка; покращення — «План»)
- [ ] **T6.8a** `backend/testing.md` (Vitest, `*.spec.ts`, моки)
- [ ] **T6.8b** `backend/deployment.md` (build, Dockerfile, міграції в проді)
- [ ] **T6.9a** `shared/index.md`
- [ ] **T6.9b** `frontend/index.md`
- [ ] **T6.9c** `playground/index.md`
- [ ] **T6.10a** `guide/workflow.md`
- [ ] **T6.10b** `reference/toolchain.md`
- [ ] **T6.10c** `reference/glossary.md`
- [ ] **T6.10d** `reference/roles-capabilities.md`

---

### Критичний шлях

`T0.1 → T0.3 → T1.1…T1.8 → T2.1 → T2.2 → T2.3 → T2.3a → T2.4 → T2.5 → T3.1 → T3.2 → T3.3 → T3.4 → T4.0…T4.13 → T5.1 → T5.2 → T5.3 (потребує T3.5) → T5.3a → T5.4 → T5.5 → T5.7`

Паралельно можна: T3.5 (власник, будь-коли до T5.3); T5.6 після T5.2; T4.1/T4.5/T4.12 між собою; T4.3 паралельно з T4.6–T4.8.
