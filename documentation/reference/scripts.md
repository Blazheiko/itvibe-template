# Скрипти

Повний перелік pnpm-скриптів монорепозиторію. Кореневі скрипти запускаються з кореня (`pnpm <script>`), скрипти пакетів — через фільтр: `pnpm --filter <package> <script>`. Описи складено за фактичним вмістом `scripts` у кожному `package.json`.

## Корінь

Джерело: [package.json](https://github.com/Blazheiko/itvibe-template/blob/main/package.json).

| Скрипт            | Команда                                                                                                          | Що робить                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `build`           | `pnpm -r build`                                                                                                  | Збирає всі пакети workspace рекурсивно                                                  |
| `build:shared`    | `pnpm --filter shared build`                                                                                     | Збирає лише `shared`                                                                    |
| `dev`             | `pnpm run build:shared && pnpm --filter backend build && pnpm --filter backend --filter frontend --parallel dev` | Збирає `shared` і `backend`, потім паралельно запускає dev-сервери бекенду та фронтенду |
| `dev:manual_test` | `pnpm run build:shared && sh -c '... backend dev & ... api-playground dev & wait'`                               | Збирає `shared` і паралельно запускає бекенд та `api-playground`                        |
| `dev:backend`     | `pnpm --filter backend dev`                                                                                      | Dev-сервер лише бекенду                                                                 |
| `dev:frontend`    | `pnpm --filter frontend dev`                                                                                     | Dev-сервер лише фронтенду                                                               |
| `docs:dev`        | `pnpm --filter documentation docs:dev`                                                                           | Dev-сервер документації                                                                 |
| `docs:build`      | `pnpm --filter documentation docs:build`                                                                         | Збирає сайт документації                                                                |
| `docs:preview`    | `pnpm --filter documentation docs:preview`                                                                       | Попередній перегляд зібраної документації                                               |
| `docs:verify`     | `pnpm --filter documentation docs:verify`                                                                        | Перевіряє зібраний сайт документації                                                    |
| `start`           | `pnpm --filter backend start`                                                                                    | Запускає зібраний бекенд                                                                |
| `lint`            | `eslint . && pnpm -r --if-present lint:check`                                                                    | ESLint по всьому репозиторію, потім `lint:check` у пакетах, де він є                    |
| `lint:fix`        | `eslint . --fix`                                                                                                 | ESLint з автовиправленням                                                               |
| `format`          | `prettier --write "**/*.{ts,tsx,json,md}"`                                                                       | Форматує файли Prettier                                                                 |
| `format:check`    | `prettier --check "**/*.{ts,tsx,json,md}"`                                                                       | Перевіряє форматування                                                                  |
| `typecheck`       | `pnpm -r typecheck`                                                                                              | Перевірка типів у всіх пакетах                                                          |
| `test`            | `pnpm -r test`                                                                                                   | Тести всіх пакетів                                                                      |
| `clean`           | `pnpm -r clean && rm -rf node_modules`                                                                           | Викликає `clean` у пакетах і видаляє кореневий `node_modules`                           |

## backend

Джерело: [packages/backend/package.json](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/package.json).

| Скрипт           | Команда                              | Що робить                                                                                                                                             |
| ---------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`          | `tsc --build`                        | Компілює TypeScript у `dist/`                                                                                                                         |
| `dev`            | `tsx watch src/index.ts`             | Запускає сервер з перезапуском при змінах                                                                                                             |
| `start`          | `node dist/index.js`                 | Запускає зібраний сервер                                                                                                                              |
| `clean`          | `rm -rf dist .tsbuildinfo`           | Видаляє артефакти збірки                                                                                                                              |
| `typecheck`      | `tsc --noEmit`                       | Перевірка типів                                                                                                                                       |
| `db:create`      | `tsx src/db/create-database.ts`      | Створює базу даних ([create-database.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/db/create-database.ts))          |
| `db:create:prod` | `node dist/db/create-database.js`    | Те саме зі зібраного коду                                                                                                                             |
| `db:generate`    | `drizzle-kit generate`               | Генерує міграцію зі схеми ([drizzle.config.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/drizzle.config.ts))            |
| `db:migrate`     | `drizzle-kit migrate`                | Застосовує міграції                                                                                                                                   |
| `db:studio`      | `drizzle-kit studio`                 | Відкриває Drizzle Studio                                                                                                                              |
| `db:seed`        | `tsx src/db/seed.ts`                 | Заповнює БД початковими даними ([seed.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/db/seed.ts))                    |
| `mail:test`      | `tsx src/scripts/send-test-email.ts` | Надсилає тестовий лист ([send-test-email.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/scripts/send-test-email.ts)) |
| `test`           | `vitest run`                         | Одноразовий прогін Vitest                                                                                                                             |
| `test:watch`     | `vitest`                             | Vitest у watch-режимі                                                                                                                                 |

## frontend

Джерело: [packages/frontend/package.json](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/package.json).

| Скрипт       | Команда                                                        | Що робить                                                                                                                               |
| ------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`        | `vite`                                                         | Dev-сервер Vite                                                                                                                         |
| `build`      | `run-p type-check "build-only {@}" -- && npm run build-sw`     | Паралельно typecheck і збірка, потім збірка service worker                                                                              |
| `preview`    | `vite preview`                                                 | Перегляд зібраного застосунку                                                                                                           |
| `test:unit`  | `vitest`                                                       | Vitest у watch-режимі                                                                                                                   |
| `test:e2e`   | `playwright test`                                              | Playwright e2e-тести                                                                                                                    |
| `build-only` | `vite build`                                                   | Лише збірка Vite                                                                                                                        |
| `build-sw`   | `vite build --config vite.sw.config.ts`                        | Збірка service worker ([vite.sw.config.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/vite.sw.config.ts)) |
| `type-check` | `vue-tsc --build`                                              | Перевірка типів (інкрементальна)                                                                                                        |
| `typecheck`  | `vue-tsc --build --force && tsc --noEmit -p e2e/tsconfig.json` | Повна перевірка типів, разом з e2e-тестами Playwright                                                                                   |
| `lint`       | `eslint . --fix`                                               | ESLint з автовиправленням                                                                                                               |
| `lint:check` | `eslint .`                                                     | ESLint без змін (викликається кореневим `lint`)                                                                                         |
| `format`     | `prettier --write src/`                                        | Форматує `src/`                                                                                                                         |
| `test`       | `vitest run`                                                   | Одноразовий прогін Vitest                                                                                                               |

## shared

Джерело: [packages/shared/package.json](https://github.com/Blazheiko/itvibe-template/blob/main/packages/shared/package.json).

| Скрипт      | Команда                                    | Що робить                                                 |
| ----------- | ------------------------------------------ | --------------------------------------------------------- |
| `build`     | `tsc --build`                              | Компілює в `dist/`                                        |
| `dev`       | `tsc --build --watch`                      | Компіляція у watch-режимі                                 |
| `clean`     | `rm -rf dist .tsbuildinfo`                 | Видаляє артефакти збірки                                  |
| `typecheck` | `tsc --noEmit`                             | Перевірка типів                                           |
| `test`      | `pnpm build && node --test test/*.test.js` | Збирає пакет і запускає тести вбудованим test runner Node |

## api-playground

Джерело: [packages/api-playground/package.json](https://github.com/Blazheiko/itvibe-template/blob/main/packages/api-playground/package.json).

| Скрипт       | Команда                                | Що робить                        |
| ------------ | -------------------------------------- | -------------------------------- |
| `dev`        | `vite`                                 | Dev-сервер Vite                  |
| `build`      | `run-p type-check "build-only {@}" --` | Паралельно typecheck і збірка    |
| `preview`    | `vite preview`                         | Перегляд збірки                  |
| `build-only` | `vite build`                           | Лише збірка                      |
| `type-check` | `vue-tsc --build`                      | Перевірка типів (інкрементальна) |
| `typecheck`  | `vue-tsc --build --force`              | Повна перевірка типів            |
| `lint`       | `eslint . --fix`                       | ESLint з автовиправленням        |
| `lint:check` | `eslint .`                             | ESLint без змін                  |
| `format`     | `prettier --write src/`                | Форматує `src/`                  |

У `api-playground` немає скрипта `test`, тому `pnpm test` його пропускає.

## documentation

Джерело: [documentation/package.json](https://github.com/Blazheiko/itvibe-template/blob/main/documentation/package.json).

| Скрипт         | Команда                                   | Що робить                                                                                                                                   |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs:dev`     | `vitepress dev`                           | Dev-сервер VitePress                                                                                                                        |
| `docs:build`   | `vitepress build`                         | Збірка сайту                                                                                                                                |
| `docs:preview` | `vitepress preview`                       | Перегляд зібраного сайту                                                                                                                    |
| `docs:verify`  | `node scripts/verify-dist.mjs`            | Перевірки зібраного сайту ([verify-dist.mjs](https://github.com/Blazheiko/itvibe-template/blob/main/documentation/scripts/verify-dist.mjs)) |
| `typecheck`    | `tsc --noEmit -p tsconfig.json`           | Перевірка типів                                                                                                                             |
| `test`         | `node --test "scripts/verify/*.test.mjs"` | Тести скриптів перевірки                                                                                                                    |
