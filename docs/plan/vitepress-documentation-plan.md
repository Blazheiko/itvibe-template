# План: документація шаблону itvibe на VitePress (GitHub Pages)

> **Статус:** виконано у feat-003 (PR #2, merge `bc32821`, 2026-10-19) і feat-011 (етап 6, PR #9–#18, останній merge `8515b09`, 2026-10-20). Документи з `packages/backend/src/docs/`, `SECURITY_ANALYSIS.md` і `directory-structure.md`, на які посилається план, у feat-009 видалено або перенесено — див. [`internal-docs-cleanup-plan.md`](./internal-docs-cleanup-plan.md).

> Ревізія 3: враховано рев'ю (OpenAPI, CI на PR, TS/ESLint, env-довідник, статус історичних
> документів, перевірка відрендереного контенту, зменшений перший випуск); деплой лише з `main`,
> уточнені правила `docs:verify`, посилання в README — одразу після деплою v1.

## 1. Мета та обсяг

- Сайт документації на **VitePress 1.x** у новій папці `documentation/` в корені репозиторію.
- Основний фокус — **бекенд** (`packages/backend`).
- Публікація на **GitHub Pages** через GitHub Actions: `https://blazheiko.github.io/itvibe-template/`.
- Документація пишеться **з читання коду**; кожне твердження має посилання на файл-джерело.

**Поза обсягом (окремі майбутні фічі):**

- Генерація OpenAPI. `packages/backend/src/openapi/spec.ts` зараз порожній (0 байт), тому він
  **не** є джерелом правди. Генерація потребує змін коду застосунку → окремий `feat-XXX`.
- Зміни коду застосунку, включно з виправленням `.env.example` (лише фіксуємо розбіжності).
- Версіонування документації, англійська локаль.

## 2. Технічні рішення

| Питання      | Рішення                                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Розміщення   | `documentation/` — workspace-пакет `documentation`; додати `- 'documentation'` у `pnpm-workspace.yaml` (зараз там лише `packages/*`)                                                                                                                                         |
| Залежності   | `vitepress@^1`, `vitepress-plugin-mermaid`, `mermaid`. `vue` **не** оголошувати явно, якщо VitePress не вимагає peer; інакше — `^3.5.44`, як у `packages/frontend`. Сумісність VitePress ↔ Mermaid-плагін підтвердити на мінімальному каркасі (етап 1) до написання контенту |
| `base`       | `/itvibe-template/`                                                                                                                                                                                                                                                          |
| Мова         | Українська (`lang: 'uk-UA'`), структура готова до `locales`                                                                                                                                                                                                                  |
| Пошук        | `search.provider: 'local'`; перевірити, що пошук знаходить українські слова (за потреби — `miniSearch` options / власний tokenizer)                                                                                                                                          |
| Маршрути API | Описати **фактичний** механізм: серіалізацію маршрутів `vendor/utils/routing/serialize-routes.ts`, що використовується сторінкою документації (`DOC_PAGE`) і manual-test режимом (`pnpm dev:manual_test` + `api-playground`)                                                 |
| TypeScript   | `documentation/tsconfig.json` (extends `tsconfig.base.json`), `include: [".vitepress/**/*.ts", ".vitepress/**/*.vue"]`; скрипт `typecheck: "vue-tsc --noEmit"` (або `tsc --noEmit`, якщо немає `.vue`) — щоб `pnpm -r typecheck` реально перевіряв пакет                     |
| ESLint       | Кореневий `eslint.config.ts` використовує type-aware правила з `projectService` → новий `tsconfig.json` має покривати `.vitepress/config.ts` і `theme/index.ts`. Ігнорувати `documentation/.vitepress/{cache,dist}`. Точну конфігурацію підтвердити пробним `pnpm lint`      |
| Ігнори       | `documentation/.vitepress/{cache,dist}` → `.gitignore`, `.prettierignore`, ESLint ignores                                                                                                                                                                                    |
| Dead links   | `ignoreDeadLinks: false` (збірка падає на мертвих внутрішніх посиланнях)                                                                                                                                                                                                     |

## 3. Політика джерел контенту

Перед перенесенням кожного наявного документа визначити його **статус**:

| Документ                                                                           | Статус (попередньо, підтвердити читанням коду) | Дія                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/backend/src/docs/SESSION_SECURITY.md`                                    | опис реалізації                                | include / перенос у `backend/security.md` після звірки з кодом                                                                                      |
| `packages/backend/src/vendor/start/SECURITY_ANALYSIS.md`                           | аналіз                                         | використати як джерело, підтверджені факти — в `security.md`                                                                                        |
| `packages/backend/src/docs/VALIDATOR_ABSTRACTION_PLAN.md`                          | **план рефакторингу**                          | не публікувати як опис реалізації; `validation.md` описує фактичний код `app/validate`; за потреби — окремий розділ «Плани / ADR» з явною позначкою |
| `packages/backend/src/docs/etag-improvements.md`                                   | **можливі покращення**                         | `caching-etag.md` описує поточну поведінку; покращення — лише з позначкою «план»                                                                    |
| `packages/backend/src/docs/HTTP_BODY_LIMITS_PLAN.md`                               | план (перевірити, чи реалізовано)              | публікувати лише реалізовану частину (`APP_MAX_*_BODY_SIZE`)                                                                                        |
| `packages/backend/README.md`, `vendor/directory-structure.md`, `scripts/README.md` | актуальні                                      | include або перенос                                                                                                                                 |

Правила:

- Публічні сторінки описують **підтверджену реалізацію**. Плани/альтернативи — тільки в
  контейнері `::: warning План` або в окремому розділі «Плани».
- `<!--@include: ...-->` у VitePress 1.x **може мовчки пропустити відсутній файл**
  (див. документацію v1 «Markdown File Inclusion»), тому кожен include перевіряється
  скриптом після збірки (див. етап 4).

## 4. Структура папки

Позначки: **[v1]** — перший випуск, **[v2]** — наступні ітерації.

```
documentation/
├── package.json
├── tsconfig.json
├── .vitepress/
│   ├── config.ts
│   └── theme/{index.ts,custom.css}
├── scripts/
│   └── verify-dist.mjs            # перевірка відрендереного контенту (етап 4)
├── public/{logo.svg,screenshots/}
├── index.md                                [v1]
├── guide/
│   ├── introduction.md                     [v1]
│   ├── getting-started.md                  [v1]  Node 24 (.nvmrc), pnpm, PostgreSQL, Redis, .env, db:create, db:migrate, db:seed, pnpm dev
│   ├── project-structure.md                [v1]
│   └── workflow.md                         [v2]  feature_list.json, progress.md, DoD
├── backend/
│   ├── index.md                            [v1]  огляд і стек
│   ├── architecture.md                     [v1]  route → middleware → controller → service → repository → transformer
│   ├── request-lifecycle.md                [v1]  vendor/start/server.ts, router.ts; mermaid
│   ├── configuration.md                    [v1]  env-довідник (див. нижче)
│   ├── routing-middlewares.md              [v1]  http-routes.ts, ws-routes.ts, kernel.ts, csrf/admin guard, serialize-routes, DOC_PAGE
│   ├── database.md                         [v1]  Drizzle 1.0.0-rc.4, schema, relations v2, міграції, db:* скрипти
│   ├── auth-security.md                    [v1]  сесії, cookies, OAuth (arctic), CSRF, CSP, CORS, rate-limit, body limits, trust proxy
│   ├── adding-a-feature.md                 [v1]  один наскрізний перевірений приклад
│   ├── controllers-services.md             [v2]
│   ├── repositories-transformers.md        [v2]
│   ├── validation.md                       [v2]
│   ├── websocket.md                        [v2]
│   ├── storage.md / mail-push.md / ai.md   [v2]
│   ├── observability.md                    [v2]  logger, Sentry, GET /api/ping
│   ├── caching-etag.md                     [v2]
│   ├── testing.md                          [v2]
│   └── deployment.md                       [v2]  build, Dockerfile, міграції в проді
├── shared/index.md                         [v2]
├── frontend/index.md                       [v2]
├── playground/index.md                     [v2]
└── reference/
    ├── scripts.md                          [v1]
    ├── toolchain.md                        [v2]
    ├── glossary.md                         [v2]
    └── roles-capabilities.md               [v2]
```

### Довідник конфігурації (`backend/configuration.md`)

Будується з **фактичного читання env у коді** (`packages/backend/src/config/*.ts`,
`vendor/utils/env`, `drizzle.config.*`), а не з `.env.example`. Для кожної змінної:

| Змінна | Призначення | Default | Обов'язковість (умова) | Читає файл |
| ------ | ----------- | ------- | ---------------------- | ---------- |

Окремий блок «Розбіжності з `.env.example`» (уже зафіксовані в `packages/backend/README.md`):
`APP_UNIX_PATH` замість `UNIX_PATH`; `DATABASE_URL` не використовується (діють `PGSQL_*`);
`REDIS_*`, `APP_MAX_*_BODY_SIZE`, `API_PATH_PREFIX`, `CDN_URL` частково відсутні в
`.env.example`. Інвентаризацію робити `grep`-ом по `process.env` / env-хелперу, щоб нічого не пропустити.

`guide/getting-started.md`: команди перевіряються на **чистому оточенні** (свіжий clone, порожня
БД, локальні PostgreSQL + Redis, напр. через docker) — результат фіксується в `progress.md`.

## 5. Етапи реалізації

### Етап 0 — Підготовка

1. Запис `feat-XXX: vitepress-documentation` у `feature_list.json` через PR у `main`; гілка `feat/vitepress-docs`.
2. Окремим записом зареєструвати майбутню фічу «OpenAPI generation» (status `not-started`).

### Етап 1 — Мінімальний каркас + перевірка інструментів

1. `package.json` (`docs:dev`, `docs:build`, `docs:preview`, `docs:verify`, `typecheck`), `tsconfig.json`, `config.ts` з однією сторінкою, одним Mermaid-блоком, одним include і однією картинкою.
2. `pnpm-workspace.yaml`, кореневі скрипти `docs:dev` / `docs:build`, ігнори.
3. **Приймання каркаса:** `pnpm --filter documentation docs:build`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` — зелені; Mermaid рендериться; сумісність версій підтверджена.

### Етап 2 — Контент v1

Сторінки з позначкою **[v1]**, у порядку: getting-started (з перевіркою на чистому оточенні) →
backend/index → architecture → request-lifecycle → configuration → routing-middlewares →
database → auth-security → adding-a-feature (приклад реально прогнати: створити ресурс за
інструкцією в тимчасовій гілці, `pnpm typecheck && pnpm --filter backend test`, потім відкотити).

### Етап 3 — CI/CD

`.github/workflows/docs.yml`:

```yaml
name: Docs
on:
  pull_request:
    paths: &docs_paths
      - 'documentation/**'
      - 'packages/backend/README.md'
      - 'packages/backend/src/docs/**'
      - 'packages/backend/src/vendor/start/*.md'
      - 'packages/backend/src/vendor/directory-structure.md'
      - 'packages/backend/src/scripts/README.md'
      - 'docs/reference/**'
      - 'docs/screenshots/**'
      - 'pnpm-lock.yaml'
      - 'pnpm-workspace.yaml'
      - 'package.json'
      - '.nvmrc'
      - '.github/workflows/docs.yml'
  push:
    branches: [main]
    paths: *docs_paths
  workflow_dispatch:

permissions: { contents: read }
concurrency: { group: docs-${{ github.ref }}, cancel-in-progress: true }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }          # lastUpdated
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter documentation typecheck
      - run: pnpm --filter documentation docs:build
      - run: pnpm --filter documentation docs:verify
      - if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v3
        with: { path: documentation/.vitepress/dist }

  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    permissions: { pages: write, id-token: write }
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    steps:
      - uses: actions/configure-pages@v5
      - id: deployment
        uses: actions/deploy-pages@v4
```

- PR → тільки збірка + перевірки; merge у `main` → збірка + деплой. `workflow_dispatch` з
  іншої гілки лише збирає сайт — upload і deploy мають однакову умову `github.ref == 'refs/heads/main'`.
- Список `paths` синхронізується зі списком include-джерел (див. §3); `docs:verify` падає, якщо
  include посилається на файл поза цим списком (захист від «тихого» застарівання).
- YAML-якорі (`&docs_paths` / `*docs_paths`) GitHub Actions на GitHub.com підтримує з вересня 2025 —
  дублювання списку не потрібне.
- Вручну власником: **Settings → Pages → Source: GitHub Actions**.

### Етап 4 — Перевірка відрендереного контенту (`scripts/verify-dist.mjs`)

Автоматично після `docs:build`. Усі перевірки вмісту працюють **лише всередині контейнера
статті** (`.vp-doc` у default theme), а не по всьому HTML: sidebar, nav і footer містять заголовки
інших сторінок, а порожня стаття має повну HTML-оболонку.

1. **Include.** Для кожного `<!--@include: path-->` у `*.md`: файл-джерело існує, і в `.vp-doc`
   відповідної сторінки присутні **обидва** маркери — очікуваний заголовок фрагмента та
   характерний рядок тексту з нього (не з заголовка). Маркери беруться з самого файлу-джерела
   (перший `#`-заголовок + перший непорожній абзац) або задаються явно в мапі в `verify-dist.mjs`.
2. **Ключові сторінки v1.** Існують у `dist`; `.vp-doc` містить очікуваний `h1` і має текстовий
   вміст понад поріг (напр. ≥ 300 символів без заголовків).
3. **URL** (з атрибутів `src`/`href`/`srcset` в HTML), класифікуються та перевіряються окремо:
   - _зовнішні та спеціальні схеми_ (`http(s)://`, `//`, `mailto:`, `tel:`, `data:`, `javascript:`)
     і чисті `#anchor` — **виключаються** з перевірки локальних файлів;
   - _локальні ресурси_ (js, css, зображення, шрифти, `.svg`, `.json` тощо): шлях починається з
     `/itvibe-template/`, а файл без префікса base існує в `dist`;
   - _внутрішні сторінки_: шлях починається з `/itvibe-template/`; з урахуванням `cleanUrls`
     `/x/y` відповідає `dist/x/y.html` або `dist/x/y/index.html`; фрагмент `#id` (якщо є)
     існує як `id` на цільовій сторінці.
4. **Mermaid.** У `.vp-doc` присутній контейнер плагіна для кожного mermaid-блоку з джерела.
   Це підтверджує лише **включення** блоку; фактичний рендеринг SVG перевіряється вручну (нижче).

Вручну після першого деплою (фіксується в `progress.md`):

- пряме відкриття та **перезавантаження** вкладених URL (`/itvibe-template/backend/configuration`) — без 404 (`cleanUrls` на Pages);
- пошук українською знаходить, напр., «міграції», «сесія»;
- Mermaid рендериться в SVG без помилок у консолі, картинки завантажуються, dark/light теми.

Після першого успішного деплою v1 — **одразу** додати посилання та бейдж документації в `README.md`.

### Етап 5 — v2 та підтримка

- Поступово сторінки **[v2]**, кожна — окремим невеликим PR з тим самим CI.
- Правило в `AGENTS.md`: зміна публічної поведінки бекенду (route, env, middleware, міграції)
  супроводжується оновленням відповідної сторінки `documentation/backend/`.

## 6. Ризики

| Ризик                                         | Мітигація                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| Документація застаріває                       | Посилання на файли-джерела, CI-тригери на джерела include, правило в AGENTS.md |
| Include мовчки зникає                         | `docs:verify` перевіряє наявність включеного контенту в `dist`                 |
| Плани публікуються як реалізація              | Політика статусів (§3), явні позначки `::: warning План`                       |
| Нестабільна оцінка обсягу                     | Перший випуск обмежено [v1]; решта — інкрементально                            |
| Type-aware ESLint падає на `.vitepress`       | Власний `tsconfig.json`, `pnpm lint` в прийманні каркаса                       |
| Неправильний `base` / 404 на перезавантаженні | `docs:verify` п.3 + ручна перевірка після деплою                               |
| Секрети в прикладах                           | Лише плейсхолдери, без реальних значень                                        |

## 7. Definition of Done (v1)

- [ ] Каркас: `docs:build`, `typecheck`, `lint`, `format:check`, `test` у workspace — зелені.
- [ ] Усі сторінки **[v1]** написані й звірені з кодом; env-довідник містить усі змінні, знайдені в коді, з файлом-джерелом.
- [ ] getting-started перевірено на чистому оточенні; приклад `adding-a-feature` реально прогнано.
- [ ] Історичні документи класифіковано (§3); плани не подано як реалізацію.
- [ ] CI: збірка на PR, деплой після merge у `main`; `docs:verify` зелений.
- [ ] На Pages: вкладені URL відкриваються й перезавантажуються, пошук українською, Mermaid, зображення під `/itvibe-template/` працюють.
- [ ] `README.md` містить посилання на опублікований сайт.
- [ ] Окремий запис для OpenAPI-генерації створено в `feature_list.json`.
- [ ] Evidence у `progress.md`; `feature_list.json` → `done`.
