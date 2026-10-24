# Toolchain

Тут зібрано версії інструментів, місця, де їх закріплено, і налаштування компілятора, лінтера та форматера. Короткі правила оновлення наведено в розділі Toolchain Notes файлу [`AGENTS.md`](https://github.com/Blazheiko/itvibe-template/blob/main/AGENTS.md).

## Версії

| Інструмент                      | Версія                                     | Де закріплено                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js                         | `^24.15.0` (engines), `24.20.0` (`.nvmrc`) | [`package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/package.json) `engines.node`, [`.nvmrc`](https://github.com/Blazheiko/itvibe-template/blob/main/.nvmrc)                                                                                                                                                     |
| pnpm                            | `>=9.0.0` (engines), `pnpm@9.15.0`         | `engines.pnpm` і `packageManager` у [`package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/package.json)                                                                                                                                                                                                           |
| TypeScript                      | `6.0.3` (точно)                            | корінь, [`backend`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/package.json), [`frontend`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/package.json), [`documentation`](https://github.com/Blazheiko/itvibe-template/blob/main/documentation/package.json) та інші пакети |
| ESLint                          | `^10.13.0`                                 | [`package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/package.json)                                                                                                                                                                                                                                               |
| typescript-eslint               | `^8.71.2`                                  | [`package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/package.json) + `pnpm.overrides`                                                                                                                                                                                                                            |
| Prettier                        | `^3.9.10`                                  | [`package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/package.json)                                                                                                                                                                                                                                               |
| drizzle-orm / drizzle-kit       | `1.0.0-rc.4` (точно)                       | [`packages/backend/package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/package.json)                                                                                                                                                                                                             |
| Vitest                          | `^5.0.5`                                   | [`backend`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/package.json), [`frontend`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/package.json)                                                                                                                              |
| Playwright (`@playwright/test`) | `^1.64.1`                                  | [`packages/frontend/package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/package.json)                                                                                                                                                                                                           |
| Vue / Vite                      | `^3.5.44` / `^7.3.7`                       | [`frontend`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/frontend/package.json), [`api-playground`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/api-playground/package.json)                                                                                                                |
| VitePress                       | `1.6.4` (точно)                            | [`documentation/package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/documentation/package.json)                                                                                                                                                                                                                   |

::: warning
`engines.node` дозволяє будь-яку `24.x` від `24.15.0`, а `.nvmrc` вказує конкретну `24.20.0`. Конфлікту тут немає, але CI та локальне оточення можуть працювати на різних патчах.
:::

## `pnpm.overrides`

Корінь [`package.json`](https://github.com/Blazheiko/itvibe-template/blob/main/package.json) примусово ставить `@typescript-eslint/utils`, `typescript-estree`, `project-service` і `tsconfig-utils` на `^8.71.2`. Так транзитивні залежності тримаються на лінії, сумісній з TypeScript 6. За правилом `AGENTS.md` ці overrides оновлюють разом із `typescript-eslint`.

## TypeScript

Спільна база лежить у [`tsconfig.base.json`](https://github.com/Blazheiko/itvibe-template/blob/main/tsconfig.base.json): `target`/`lib` `ES2022`, `module` і `moduleResolution` `NodeNext`. Крім `strict: true`, увімкнено:

- `noUncheckedIndexedAccess`: доступ за індексом повертає `T | undefined`;
- `exactOptionalPropertyTypes`: опційне поле не можна явно присвоїти `undefined`;
- `noPropertyAccessFromIndexSignature`: index signature читається тільки як `obj["key"]` (тому в конфігу пишуть `env["CSRF_ENFORCE"]`);
- `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`;
- `isolatedModules` і `verbatimModuleSyntax`: імпорти лише типів мають бути `import type`.

Path aliases бекенду в [`packages/backend/tsconfig.json`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/tsconfig.json) (`#app/*`, `#config/*`, `#vendor/*`, `#database/*`, `#drizzle/*`, `#logger`) задано відносними шляхами на кшталт `./src/app/*`, **без `baseUrl`**. `baseUrl` застарів у TypeScript 6 і перестане працювати в TypeScript 7, тож повертати його не можна.

## ESLint

Плоский конфіг [`eslint.config.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/eslint.config.ts) збирається через `tseslint.config(...)`:

- база: `eslint.configs.recommended`, `tseslint.configs.strictTypeChecked`, `stylisticTypeChecked`, type-aware режим через `projectService`;
- глобально як `error`: `explicit-function-return-type`, `explicit-module-boundary-types`, `no-explicit-any`, сімейство `no-unsafe-*`, `strict-boolean-expressions` (без `allowString`/`allowNumber`/`allowNullableObject`), `switch-exhaustiveness-check`, `consistent-type-imports` (inline type imports), `consistent-type-exports`, `no-unused-vars` з ігноруванням `^_`;
- для `packages/api-playground/**`, `packages/frontend/**` і `packages/backend/**` більшість суворих правил вимкнено (`no-explicit-any`, `no-unsafe-*`, `strict-boolean-expressions`, `no-floating-promises`, `no-misused-promises`, `require-await`, `prefer-nullish-coalescing` та ін.). Для бекенду додатково вимкнено `no-base-to-string`, `no-unsafe-function-type`, `no-constant-binary-expression` тощо;
- `.vue` файли frontend і api-playground коренева конфігурація ігнорує. Їх перевіряють власні `eslint.config.ts` пакетів через `pnpm -r --if-present lint:check`, який запускає кореневий `pnpm lint`.

::: warning
Фактично суворий профіль діє лише для `packages/shared` та інших файлів поза трьома пакетами з послабленнями. Бекенд, фронтенд і playground перевіряються значно м'якше, ніж можна подумати з `strictTypeChecked`.
:::

## Prettier

- Один кореневий [`.prettierrc.json`](https://github.com/Blazheiko/itvibe-template/blob/main/.prettierrc.json) для всіх пакетів: `tabWidth: 4`, `singleQuote: true`, `semi: false`, `printWidth: 100` — стиль з `AGENTS.md`. Пакетних конфігів немає.
- [`.prettierignore`](https://github.com/Blazheiko/itvibe-template/blob/main/.prettierignore): `node_modules`, `dist`, `coverage`, звіти Playwright, міграції Drizzle, кеш і dist VitePress, `pnpm-lock.yaml`, `graphify-out`.
- Кореневі `pnpm format` / `pnpm format:check` обробляють `**/*.{ts,tsx,json,md}`; на `main` `format:check` проходить.
- Масове форматування (feat-010) записано в [`.git-blame-ignore-revs`](https://github.com/Blazheiko/itvibe-template/blob/main/.git-blame-ignore-revs). Щоб `git blame` його пропускав: `git config blame.ignoreRevsFile .git-blame-ignore-revs`.

::: warning Відома проблема
Glob `format:check` не охоплює `.vue`, `.js`, `.mjs` і `.css`, тож ці файли не перевіряються (п. 71 у [`code-issues-found-during-docs.md`](https://github.com/Blazheiko/itvibe-template/blob/main/docs/plan/code-issues-found-during-docs.md)). Пакетні `pnpm --filter frontend format` і `pnpm --filter api-playground format` форматують `src/` за кореневим конфігом.
:::

## Drizzle

`drizzle-orm` і `drizzle-kit` закріплено на release candidate `1.0.0-rc.4`, бо стабільного 1.0 ще немає. Оновлюють їх разом, на одну й ту саму точну версію, а після виходу `1.0.0` переходять на неї. Relations описано через Relational Queries v2 (`defineRelations` у [`relations.ts`](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/database/relations.ts)). Міграції зберігаються у форматі 1.0 «папка на міграцію». Детальніше в розділі [База даних](/backend/database).

## Тести й документація

- Vitest використовується для unit-тестів бекенду і фронтенду, Playwright для e2e фронтенду (`pnpm --filter frontend test:e2e`). Пакет `shared` тестується вбудованим runner Node після збірки. Див. [Тестування](/backend/testing).
- Цей сайт збирається VitePress `1.6.4` з плагіном `vitepress-plugin-mermaid`. Команди `docs:*` описано в розділі [Скрипти](/reference/scripts).
