# План: `db:seed` замість порожньої заглушки (п. 10)

> **Статус:** виконано у feat-007, п. 10 (PR #43, merge `aaa46cf`, 2026-10-21).

Пункт 10 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Фіча: **feat-007 «Database DX»** (разом із п. 7 і 11).
Шляхи відносно `packages/backend/`, якщо не вказано інше.

## Проблема

`src/db/seed.ts` містить лише `import "dotenv/config"`. Тому свіжа БД неповноцінна:

1. **Промптами неможливо керувати з адмінки.** Міграції нічого не вставляють у `llm_system_prompts`. AI при цьому працює: сервіси мають fallback-тексти (`src/config/support.ts`: `defaultSystemPrompt`, `defaultFirstChatPrompt`; `DEFAULT_SYSTEM_PROMPT` у `src/app/services/support/support-query-translation-service.ts`; використання — `src/app/services/support/support-llm-service.ts`). Проте `promptRepository.update` (`src/app/repositories/ai/prompt-repository.ts`) робить лише `UPDATE … WHERE type = ?`. Для відсутнього рядка він повертає `false`, тож з адмінки промпт не створити й не змінити, поки в БД немає рядків.
2. **Немає адміна.** `admin-guard` перевіряє `role = 'admin'`, а через реєстрацію цю роль отримати не можна. Зараз адміна створюють лише вручну через SQL.

## Рішення

Seed має бути ідемпотентним і складатися з двох частин.

| Частина                                                                                        | Коли                          | Повторний запуск                                                                  |
| ---------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| **Reference:** 3 промпти (`SUPPORT_SYSTEM`, `SUPPORT_FIRST_CHAT`, `SUPPORT_QUERY_TRANSLATION`) | завжди                        | `ON CONFLICT (type) DO NOTHING`: відредаговані адміном промпти не перезаписуються |
| **Demo:** адмін і, опційно, звичайний користувач                                               | **лише з прапорцем `--demo`** | наявний користувач пропускається; його пароль і роль не змінюються                |

Від `APP_ENV` seed не залежить. Звичайний `db:seed` у будь-якому середовищі створює лише reference-дані. Так контракт простіший: немає неявного визначення середовища (`APP_ENV`/`NODE_ENV`/`prod`/`APP_IS_PRODUCTION`, див. `isProductionLike` у `src/config/app.ts`). Якщо `--demo` передано при `config.isProductionLike`, seed виводить `warn`, але не блокує запуск.

### Дефолтні тексти промптів: одне джерело

Нових текстів не пишемо, бо інакше після першого seed зміниться поведінка AI. Seed і runtime-fallback беруть тексти з одного модуля:

- `src/config/support.ts` отримує `defaultTranslationPrompt` (переноситься з `support-query-translation-service.ts`, сервіс імпортує його звідти);
- `src/db/seed/prompts.ts` зіставляє типи з текстами з `supportConfig` через `satisfies Record<PromptType, …>`. Тоді новий тип у `llmPromptTypeEnum` без тексту ламає typecheck;
- плейсхолдер `{context}`, правила роботи з knowledge base і формат перекладу зберігаються без змін;
- `temperature` і `maxTokens` у seed-рядках збігаються з runtime-default (`0.5`/`512` для першого чату, `0.1`/`500` для перекладу, значення для основного чату звірити в `support-llm-service.ts`), `model = null`.

### Demo-користувачі

- Облікові дані беруться з env: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, опційно `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`. Секретів у коді немає.
- Email нормалізується через `trim().toLowerCase()`, як `normalizeEmail` в `auth-service.ts` (бажано перевикористати функцію, а не дублювати).
- Наявність перевіряється по `LOWER(email)` з урахуванням часткового індексу `users_email_unique_non_null_idx` (`LOWER(email) WHERE email IS NOT NULL`, `src/database/schema.ts`). Робимо це через select-перед-insert у транзакції, а не через `ON CONFLICT`: Drizzle не цілиться в expression-індекс з `WHERE` без сирого SQL.
- Пароль хешується через `hashPassword` з `metautil`; `emailVerifiedAt = now()`; адміну задається `role = 'admin'`.
- Роль автоматично не підвищується. Якщо email адміна вже належить користувачу з `role = 'user'`, seed завершується успішно, але виводить явний `warn`: «адмін не створений: email зайнятий звичайним користувачем».

### Звіт

`runSeed` повертає `SeedReport`. Для кожної сутності є статус `inserted` або `skipped` з причиною:

- `already_exists` — рядок уже є (для адміна окремо позначається `exists_without_admin_role`);
- `missing_credentials` — `--demo` передано, але змінні `SEED_*` для цього користувача не задано;
- `demo_disabled` — запуск без `--demo`.

CLI друкує звіт; за наявності `exists_without_admin_role` додає попередження.

## Кроки

1. **Спільні defaults:** перенести текст перекладу в `src/config/support.ts`, оновити імпорт у `support-query-translation-service.ts`, без зміни поведінки.
2. **Модуль seed** — `src/db/seed/`:
    - `prompts.ts`: мапа `PromptType` → рядок seed (`satisfies Record<PromptType, …>`);
    - `run-seed.ts`: `runSeed(db, { env, demo }): Promise<SeedReport>`, усе в одній `db.transaction` (помилка відкочує все);
    - `src/db/seed.ts`: CLI. Підключається через `resolveDatabaseConfig()`, розбирає `--demo`, друкує звіт, при помилці ставить `process.exitCode = 1`, пул закриває у `finally`.
3. **Скрипти** у `package.json`: `db:seed` (`tsx src/db/seed.ts`) і новий `db:seed:prod` (`node dist/db/seed.js`). Перевірити, що seed потрапляє в `dist`.
4. **Unit-тести** (`src/db/seed/run-seed.spec.ts`, мок `db`):
    - промпти вставляються з `onConflictDoNothing`; мапа покриває всі `PromptType`;
    - тексти seed ідентичні runtime-fallback з `supportConfig`;
    - без `--demo` користувачі не створюються (`demo_disabled`), незалежно від `APP_ENV`;
    - без `SEED_*` — `missing_credentials`, без помилки;
    - email нормалізується; пароль передається хешованим, а не відкритим текстом;
    - email адміна зайнятий звичайним користувачем → `exists_without_admin_role`, жодного `UPDATE`;
    - помилка вставки → транзакція відкочується, CLI повертає exit code 1.
5. **Конфігурація:** додати `SEED_*` у `.env.example` з placeholder-значеннями та коментарем «тільки для `--demo`».
6. **Документація** (в тому ж PR, за `AGENTS.md`):
    - `documentation/backend/database.md`: рядок `db:seed`, опис reference- і demo-частини, `--demo`;
    - `documentation/guide/getting-started.md`: прибрати примітку «заглушка»;
    - `documentation/backend/configuration.md`: змінні `SEED_*`;
    - `documentation/reference/scripts.md`: `db:seed:prod`;
    - **кеш промптів:** запускати seed до старту backend, або перезапустити backend після seed. `promptService.load()` читає промпти один раз на старті (`src/index.ts`), тому вставка ззовні кеш не оновлює (див. також п. 43);
    - **перший production-адмін:** окремий розділ, не пов'язаний із demo. Варіанти: реєстрація, потім `UPDATE users SET role = 'admin' WHERE LOWER(email) = …`, або разовий `db:seed:prod --demo` з тимчасово заданими `SEED_ADMIN_*` і негайним видаленням їх з env;
    - позначити п. 10 як виправлений у `code-issues-found-during-docs.md`.
7. **Перевірка:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm docs:build && pnpm docs:verify`.

## Ручна перевірка на реальній БД

Моки підтверджують виклики Drizzle, але не сумісність SQL з реальним індексом. Тому на чистій БД (`db:create` → `db:migrate`):

1. `db:seed` → вставлено 3 промпти, користувачі `demo_disabled`.
2. `db:seed` удруге → усе `already_exists`.
3. `db:seed --demo` із `SEED_ADMIN_*` → адміна створено. `validatePassword(SEED_ADMIN_PASSWORD, hash)` повертає `true` (перевіряється справжнім викликом, а не лише префіксом `$scrypt$`). Вхід в адмінку і відкриття `/admin` працюють.
4. Відредагувати промпт в адмінці, змінити `SEED_ADMIN_PASSWORD`, запустити `db:seed --demo` → промпт, пароль і роль не змінилися.
5. `SEED_ADMIN_EMAIL` з іншим регістром (`Admin@…`) → `already_exists`, без помилки unique-індексу.
6. Email адміна належить звичайному користувачу → `warn`, роль не змінилася.
7. Штучна помилка всередині транзакції (наприклад, невалідне значення) → у БД нічого не з'явилося, exit code 1.
8. Повторити кроки 1–2 через `pnpm build && pnpm db:seed:prod`.
9. Запустити backend після seed: support-чат використовує промпти з БД, що видно з логу `PromptService: loaded 3 prompts`.

## Поза обсягом (окремі кроки)

- `promptRepository.update` → upsert, щоб адмінка могла створювати промпти (зміна поведінки API).
- Демо-статті `support_knowledge_base` (потребують embeddings, а отже ключа AI і мережі).
- Інвалідація кешу промптів між процесами (п. 43).
- Запуск `db:seed:prod` в одноразовому job міграцій (разом із п. 30, Docker `CMD`).

## Рішення щодо відкритих питань

- Тексти промптів беруться з наявних fallback, спільне джерело — `src/config/support.ts`.
- Звичайний demo-користувач опційний (`SEED_USER_*`): він корисний для перевірки support-чату і розмежування доступу.
- Перший production-адмін описується окремо від demo-сценарію (крок 6).
