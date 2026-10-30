# feat-051: прибрати стару змінну `RESPONSE_VALIDATION`

> Статус: план (не реалізовано). Дата: 2026-10-30. Залежить від feat-046.

## 1. Задача

feat-046 перейменував `RESPONSE_VALIDATION` на `RESPONSE_VALIDATION_CONTRACT` і прибрав режим
`off` і `RESPONSE_VALIDATION_SAMPLE_RATE`. На «один реліз» старі змінні ще читаються з
попередженням при старті (`docs/plan/strip-response-fields-plan.md` §4.4):

- `RESPONSE_VALIDATION=strict|log` → те саме значення нової змінної;
- `RESPONSE_VALIDATION=off` → `log`;
- обидві задані → перемагає нова;
- `RESPONSE_VALIDATION_SAMPLE_RATE` ігнорується.

Репозиторій — шаблон без production і релізів, тож перехідне вікно нікому не потрібне. Мета:
прибрати сумісність повністю — сервер читає лише `RESPONSE_VALIDATION_CONTRACT`, старі змінні
більше нічого не означають і окремо не перевіряються (§4.1). Заодно прибрати коментарі, що
досі згадують режим `off`.

## 2. Що показав пошук

Згадки сумісності (`grep` по всіх пакетах, документації, CI, 2026-10-30):

| Місце                                                       | Що там                                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `packages/backend/src/config/response-validation.ts`        | Читання `RESPONSE_VALIDATION` і `…_SAMPLE_RATE`, поле `warnings`             |
| `packages/backend/src/config/response-validation.spec.ts`   | `describe('legacy RESPONSE_VALIDATION …')`, 6 тестів; `clean` скидає старі   |
| `packages/backend/src/app/start/validate-runtime-config.ts` | Цикл `logger.warn` по `responseValidationConfig.warnings`                    |
| `packages/backend/.env.example:230`                         | Рядок «RESPONSE_VALIDATION (strict\|log\|off) is still read for one release» |
| `documentation/backend/response-validation.md:26`           | Блок `::: warning Стара назва`                                               |
| `documentation/backend/configuration.md:265`                | «Стару `RESPONSE_VALIDATION` сервер читає ще один реліз з попередженням»     |

Застарілі коментарі про режим `off` (його немає з feat-046):

- `packages/backend/src/vendor/types/types.d.ts:288` — «null (RESPONSE_VALIDATION=off or no schema)»;
- `packages/backend/src/vendor/start/router.ts:45` — «RESPONSE_VALIDATION=off costs one null check»;
- `packages/backend/src/app/routes/route-access.spec.ts:55` — «RESPONSE_VALIDATION is never off here».

CI (`.github/`) і e2e-конфіги старі змінні не задають. Плани feat-044 / feat-046 у `docs/plan/` —
історичні документи, їх не змінюємо.

## 3. Аналіз впливу

### 3.1 Позитивний

- Конфіг стає однозначним: одна змінна, два значення, без таблиці відповідностей.
- Менше коду й тестів на шляху старту; коментарі перестають описувати неіснуючий режим.

### 3.2 Мінуси та ризики

- Старе `.env` з `RESPONSE_VALIDATION=off` мовчки перестане діяти. Прийнятно: шаблон у розробці,
  production немає (рішення власника, 2026-10-30).

### 3.3 Чого не дає

- Не змінює поведінку `RESPONSE_VALIDATION_CONTRACT` і перевірки відповідей.

## 4. Дизайн

### 4.1 Лише нова змінна

`readConfig()` у `config/response-validation.ts` читає тільки `RESPONSE_VALIDATION_CONTRACT`
(дефолт `strict`, у production `log`; невідоме значення — `configError`, як зараз). Читання
`RESPONSE_VALIDATION` і `RESPONSE_VALIDATION_SAMPLE_RATE`, таблиця відповідності й поле
`warnings` прибираються; цикл попереджень у `validateRuntimeConfig()` — теж. Старі змінні
окремо не перевіряються.

### 4.2 Коментарі й документація

- Три коментарі з §2 переписати під поточну поведінку: `responseCheck` — `null` лише для маршруту
  без `ResponseSchema`.
- `.env.example`: прибрати рядок про стару назву.
- `response-validation.md`: прибрати блок «Стара назва».
- `configuration.md`: прибрати фразу про «ще один реліз».

## 5. Кроки

1. **T0** — PR у `main`: цей план + task list; feat-051 → `in_progress`; гілка `chore/drop-legacy-response-validation`.
2. **T1** — тести (`config/response-validation.spec.ts`): прибрати
   `describe('legacy RESPONSE_VALIDATION …')`; конфіг без поля `warnings`
   (`toEqual({ mode, configError })`); задана `RESPONSE_VALIDATION` не впливає на режим.
3. **T2** — `config/response-validation.ts` за §4.1; `validate-runtime-config.ts` без циклу
   попереджень.
4. **T3** — коментарі (§4.2).
5. **T4** — `.env.example`, `response-validation.md`, `configuration.md`;
   `pnpm docs:build && pnpm docs:verify`.
6. **T5** — Definition of Done: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`,
   `CI=1 pnpm --filter frontend test:e2e`; ручна перевірка — бекенд стартує з
   `RESPONSE_VALIDATION_CONTRACT=log`; `grep` — у коді й документації (крім `docs/plan/`) немає
   згадок старих змінних; evidence у `progress.md`; feat-051 → `done`.

## 6. Рішення

- **Старі змінні окремо не обробляються** (ні помилки, ні попередження): шаблон у розробці без
  production (власник, 2026-10-30).
