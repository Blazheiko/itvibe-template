# Тестування

У монорепозиторії кожен пакет тестується окремо: backend і frontend — через Vitest, `shared` і `documentation` — через вбудований `node:test`. Кореневий скрипт `pnpm test` запускає `pnpm -r test` для всіх пакетів ([package.json](https://github.com/Blazheiko/itvibe-template/blob/main/package.json)). Нижче основна увага — backend.

## Backend: конфігурація Vitest

Конфіг [packages/backend/vitest.config.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/vitest.config.ts) мінімальний:

- `environment: "node"`;
- `exclude`: стандартні `configDefaults.exclude` плюс `dist/**` і `**/*.redis.test.ts` (Redis-тести запускає окремий `pnpm --filter backend test:redis` з [vitest.redis.config.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/vitest.redis.config.ts) і змінною `REDIS_TEST_URL`). Окремого `include` немає, тож Vitest підхоплює стандартні шаблони `*.spec.ts` / `*.test.ts`;
- `testTimeout: 15_000` — 15 с на тест замість стандартних 5 с: під паралельним навантаженням (typecheck + lint) 5 с не вистачало;
- `maxWorkers` береться з `VITEST_MAX_WORKERS`, якщо змінну задано (у CI — `2`); без неї діє значення Vitest за замовчуванням;
- аліаси `#app`, `#config`, `#vendor`, `#database`, `#drizzle` вказують на відповідні каталоги `src/`, а `#logger` — на `src/vendor/utils/logger.ts`.

`setupFiles` і секції `coverage` у конфігу немає.

Скрипти пакета ([packages/backend/package.json](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/package.json)):

| Скрипт       | Команда      |
| ------------ | ------------ |
| `test`       | `vitest run` |
| `test:watch` | `vitest`     |

Тести лежать поруч із кодом як `*.spec.ts` (наприклад, `csrf-guard.ts` і `csrf-guard.spec.ts`). Реальний прогін `pnpm --filter backend test` на гілці документації дав: **51 файл, 268 тестів, усі пройшли, ~2,2 с**. Vitest запускає кожен файл в окремому воркері (ізоляція за замовчуванням).

## Категорії тестів

| Категорія              | Приклади                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Старт сервера (vendor) | [server.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/start/server.spec.ts) (`handleError` пише 422 до заголовків), [router.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/start/router.spec.ts), [static-server.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/start/static-server.spec.ts), [http-validation.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/start/http-validation.spec.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Маршрутизація / WS     | [serialize-routes.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/routing/serialize-routes.spec.ts), [ws-validation.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/routing/ws-validation.spec.ts) (422 і невиклик handler при невалідному payload), [define-route.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/routing/define-route.spec.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Сервіси                | [auth-service.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/services/auth/auth-service.spec.ts), [knowledge-base-service.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/services/support/knowledge-base-service.spec.ts), [push-subscription-service.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/services/notifications/push-subscription-service.spec.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Middleware             | [csrf-guard.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/middlewares/csrf-guard.spec.ts) (мокає `#config/csrf.js` і будує фейковий `HttpContext`), [session-web.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/middlewares/ws/session-web.spec.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Валідація / адаптери   | [arktype-adapter.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/validate/adapters/arktype-adapter.spec.ts), [ws-message-validator.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/validate/ws-message-validator.spec.ts), [pagination.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/validate/schemas/common/pagination.spec.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Утиліти                | rate limit ([rate-limit-store.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/rate-limit/rate-limit-store.spec.ts) — обмежений стан, точний `Retry-After`, межа ключів; [http-rate-limit.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/rate-limit/http-rate-limit.spec.ts), [upgrade-rate-limit.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/rate-limit/upgrade-rate-limit.spec.ts), [server-rate-limit.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/start/server-rate-limit.spec.ts) — охоплення L1; [rate-limit.transport.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/start/rate-limit.transport.spec.ts) — справжній uWS: тіло POST не губиться, handshake 101/429), сесії/CSRF-токени, [s3.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/storage/s3.spec.ts), [logger.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/logger.spec.ts) |

## Патерни мокання

- **Barrel-модулі.** Сервіси мокають `#app/repositories/index.js` і `#app/transformers/index.js`, а потім динамічно імпортують сервіс. Детально — у [«Контролери та сервіси»](/backend/controllers-services) і [«Репозиторії та трансформери»](/backend/repositories-transformers); повний приклад — крок 9 у [«Додавання фічі»](/backend/adding-a-feature).
- **Окремі модулі.** Деякі тести мокають конкретний файл, наприклад `knowledge-base-service.spec.ts` мокає `#app/repositories/support/support-knowledge-repository.js`, `support-embedding-service.js` і `#logger`.
- **Конфіг.** `vi.mock("#config/csrf.js", ...)` у `csrf-guard.spec.ts` підставляє конфіг з `enforce: true`.
- **uWebSockets.js.** `server.spec.ts` і `http-validation.spec.ts` мокають `uWebSockets.js` (`App: () => ({})`), маршрути, `ws-handlers` та HTTP-middleware, а `HttpResponse` підміняють об'єктом із `vi.fn()` для `cork`/`writeStatus`/`writeHeader`/`end`. Справжній сервер не стартує, портів ніхто не слухає (у spec-файлах немає викликів `listen(`).
- **Часткові моки.** `vi.importActual` зберігає решту модуля, підмінюючи одну функцію (`getData` у `http-validation.spec.ts`).

Жоден spec-файл не мокає `#database/db.js` і не згадує Redis, тож для `pnpm --filter backend test` **не потрібні ні БД, ні Redis**.

## Coverage

Backend і frontend мають скрипт `test:coverage` (`vitest run --coverage` з провайдером [`@vitest/coverage-v8`](https://vitest.dev/guide/coverage), звіти `text-summary` у консоль і `html` у `coverage/`):

```bash
pnpm --filter backend test:coverage
pnpm --filter frontend test:coverage
```

Порогу немає: CI лише публікує звіт. Coverage рахується по файлах, які завантажили тести, а не по всьому `src/`. Стартові значення (рядки, жовтень 2026): backend ~74 %, frontend ~51 %.

## Інші пакети

- **shared** — `"test": "pnpm build && node --test test/*.test.js"` ([package.json](https://github.com/Blazheiko/itvibe-template/blob/main/packages/shared/package.json)): спочатку збірка, потім `node:test` над [test/languages.test.js](https://github.com/Blazheiko/itvibe-template/blob/main/packages/shared/test/languages.test.js).
- **frontend** — Vitest у `jsdom` поверх `vite.config`, з виключенням `e2e/**` і `e2e-csp/**` ([vitest.config.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/vitest.config.ts)); unit-тести в `src/**/__tests__`. Скрипти: `test` (`vitest run`), `test:unit` (`vitest`), `test:e2e` (`playwright test`). Playwright ([playwright.config.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/playwright.config.ts)) бере тести з `e2e/`, проєкти chromium, firefox, webkit і Mobile Safari, а `webServer` сам піднімає `pnpm run dev` на 5173 (на CI — `pnpm run preview` на 4173) або перевикористовує запущений. Backend Playwright не запускає. CSP перевіряє окремий конфіг [playwright.csp.config.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/playwright.csp.config.ts) з тестами в `e2e-csp/`: `test:e2e:csp` збирає production-статику (`scripts/prod-local.sh --build-only`) і двічі запускає бекенд з `SERVE_STATIC=true` — у режимі enforce і report-only. Перевіряються дозволені сценарії: реєстрація, WebSocket (до кінця handshake — очікується фрейм `pong` у відповідь на heartbeat `ping`), шрифти, service worker offline і зображення з `CDN_URL` (`naturalWidth > 0`; роль CDN грає заглушка `e2e-csp/cdn-stub.mjs`). Заборонені: inline-скрипт (`effectiveDirective` `script-src-elem`), `fetch` поза `connect-src` і зображення поза `img-src` на локальний probe-origin, з перевіркою `disposition` (`enforce` / `report`). Потрібні PostgreSQL і Redis.

::: warning Не покрито
Бекенд запускається з `APP_ENV=local` по http, тому production-гілка (`upgrade-insecure-requests`, HTTPS/WSS) і реальні S3/CDN (завантаження аватара, редирект `/support/screenshot/:id`) у браузерних тестах не перевіряються.
:::

- **documentation** — `node --test "scripts/verify/*.test.mjs"` ([package.json](https://github.com/Blazheiko/itvibe-template/blob/main/documentation/package.json)) перевіряє хелпери скрипта verify-dist ([lib.test.mjs](https://github.com/Blazheiko/itvibe-template/blob/main/documentation/scripts/verify/lib.test.mjs)).

## CI і локальний запуск

У `.github/workflows` три workflow:

| Workflow                                                                                                    | Коли                                          | Що робить                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ci.yml](https://github.com/Blazheiko/itvibe-template/blob/main/.github/workflows/ci.yml)                   | кожен PR і push у `main`, без фільтра `paths` | job `quality`: `pnpm install --frozen-lockfile` → `pnpm --filter shared build` → `format:check` → `typecheck` → `lint` → `test` → `test:coverage` (artifact `coverage`); job `e2e`: shared build → `pnpm --filter frontend build` → `playwright install --with-deps` (усі браузери; кеш `~/.cache/ms-playwright` за версією Playwright) → `test:e2e` на 4 проєктах (artifact `playwright-report` при падінні) |
| [redis-tests.yml](https://github.com/Blazheiko/itvibe-template/blob/main/.github/workflows/redis-tests.yml) | PR і push зі змінами backend/shared           | `pnpm --filter backend test:redis` із сервісом `redis:7-alpine`; єдине місце, де запускаються `*.redis.test.ts`                                                                                                                                                                                                                                                                                               |
| [docs.yml](https://github.com/Blazheiko/itvibe-template/blob/main/.github/workflows/docs.yml)               | зміни документації                            | `typecheck`, `test`, `docs:build`, `docs:verify` для пакета `documentation` і деплой на GitHub Pages з `main`                                                                                                                                                                                                                                                                                                 |

`shared` збирається перед перевірками, бо typecheck і тести backend/frontend імпортують `shared/dist`. Playwright у CI запускає `pnpm run preview` по зібраному `dist`, тож `frontend build` іде перед e2e.

Локально те саме, крім e2e і coverage, проганяє [init.sh](https://github.com/Blazheiko/itvibe-template/blob/main/init.sh) (install, typecheck, lint, `pnpm test`, build).

## Рецепти

**Тест сервісу.** Створіть `<name>-service.spec.ts` поруч із сервісом, замокайте barrel репозиторіїв і перевірте `Result`. Готовий приклад — [«Додавання фічі», крок 9](/backend/adding-a-feature).

**Тест маршруту / валідації.** Візьміть за зразок `http-validation.spec.ts`: замокайте `uWebSockets.js`, `#app/routes/http-routes.js`, `#app/routes/ws-routes.js`, `ws-handlers` і `execute-httpMiddlewares`, оголосіть маршрут через `defineRoute` зі схемою arktype і перевірте, що на невалідному тілі відповідь 422, а handler не викликається. Для WS — аналогічно `ws-validation.spec.ts`. Про схеми див. [«Валідація»](/backend/validation).

**Запуск:**

```bash
pnpm --filter backend test                     # усі тести один раз
pnpm --filter backend test:watch               # watch-режим
pnpm --filter backend test csrf-guard          # фільтр за шляхом файлу (аргумент vitest)
pnpm --filter backend exec vitest run -t "422" # фільтр за назвою тесту (через `test -t` pnpm не передає прапорець)
pnpm --filter frontend test:e2e                # Playwright
pnpm --filter frontend test:e2e:csp            # CSP на production-збірці через бекенд
```

::: warning Прогалини

- Немає тестів репозиторіїв і інтеграційних тестів з реальною БД: шар даних мокається (з реальним Redis працюють лише `*.redis.test.ts`).
- Coverage без порогу і лише по завантажених тестами файлах.

:::
