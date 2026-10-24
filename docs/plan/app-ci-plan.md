# План: CI для застосунку (feat-018, F01)

Пункти 36, 37, 38 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Roadmap: [F01](./open-issues-roadmap.md#f01-app-ci-п-36-37-38); задачі: [F01.1–F01.7](./open-issues-tasks.md#f01-app-ci-п-36-37-38).

## Вихідний стан (`main` на `0655aca`)

- Workflow: `docs.yml` (лише пакет `documentation`) і `redis-tests.yml` (`pnpm --filter backend test:redis` з Redis-сервісом). Typecheck, lint, тести backend/frontend/shared і e2e у CI не запускаються.
- `packages/backend/vitest.config.ts` виключає `**/*.redis.test.ts` через `exclude` — у звичайному `pnpm test` вони не запускаються взагалі (не «skipped»), тож `ci.yml` не може їх випадково виконати. `testTimeout` не задано (5 с).
- `packages/frontend/playwright.config.ts`: `webServer.command` — `npm run preview` у CI, `npm run dev` локально; `retries: 2`, `workers: 1` у CI; `reporter: 'html'`. Проєкти: `chromium`, `firefox`, `webkit`, `Mobile Safari`.
- `packages/frontend/package.json`: `build` викликає `npm run build-sw` — той самий `npm` у pnpm-workspace, що й п. 38.
- Coverage-інструментів немає в жодному пакеті.

## Рішення

1. **Окремий `ci.yml`, `redis-tests.yml` і `docs.yml` не чіпаємо.** Redis-тести лишаються єдиними в `redis-tests.yml`; розмежування забезпечує `exclude` у `vitest.config.ts`, а не змінна середовища.
2. **Два jobs:** `quality` (format:check, typecheck, lint, test, coverage) і `e2e`. Без фільтра `paths`: CI має бути обов'язковою перевіркою для кожного PR, а required check, що не запустився через `paths`, блокує merge.
3. **Порядок передумов чистого checkout:** `pnpm install --frozen-lockfile` → `pnpm --filter shared build` (від `shared/dist` залежать typecheck і тести) → перевірки. Для e2e додатково `pnpm --filter frontend build` (Playwright у CI запускає `vite preview` по `dist`) і `playwright install --with-deps` для всіх браузерів.
4. **п. 38:** `npm run` → `pnpm run` у `playwright.config.ts` і в скрипті `build` фронтенду.
5. **п. 37:** `testTimeout: 15_000` для backend; `maxWorkers` з env `VITEST_MAX_WORKERS` (не задано — default Vitest). У CI ставимо `2`.
6. **Coverage:** `@vitest/coverage-v8` у backend і frontend (версія — під наявний Vitest), скрипт `test:coverage`, reporters `text-summary` + `html`; artifact `coverage-backend`, `coverage-frontend`. Поріг не вводимо — окреме рішення після baseline.
7. **Playwright у CI:** reporter `html` + `list` (щоб у логах job був перелік тестів із назвами проєктів); `playwright-report` як artifact при падінні; кеш `~/.cache/ms-playwright` за версією `@playwright/test` з lockfile.

## Кроки

| Крок | Зміст                                               | Задача |
| ---- | --------------------------------------------------- | ------ |
| 1    | `pnpm` у `playwright.config.ts` і `build` фронтенду | F01.1  |
| 2    | `testTimeout`, `VITEST_MAX_WORKERS`                 | F01.2  |
| 3    | `ci.yml`, job `quality`                             | F01.3  |
| 4    | job `e2e`                                           | F01.4  |
| 5    | coverage                                            | F01.5  |
| 6    | negative control                                    | F01.6  |
| 7    | розмежування з `redis-tests.yml`                    | F01.6a |
| 8    | branch protection (власник репозиторію)             | F01.7  |
| 9    | `documentation/backend/testing.md`                  | F01.D  |

## Ризики

- **Час e2e на 4 браузерах з `retries: 2`, `workers: 1`.** Локально 12 тестів ~22 с; у CI очікуємо кілька хвилин, основне — встановлення браузерів (кеш). Якщо job довший за 15 хв — окреме рішення (matrix по проєктах).
- **Перший прогін без кешу** — довгий; він і є доказом чистого checkout (AC F01.3).
- **Required checks** вмикає власник репозиторію вручну (F01.7); до цього CI лише інформативний.
