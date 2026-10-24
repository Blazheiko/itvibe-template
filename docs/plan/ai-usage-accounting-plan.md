# План: облік використання AI (feat-028, F11)

Пункт 53 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Roadmap: [F11](./open-issues-roadmap.md); задачі: F11.1–F11.6 у [`open-issues-tasks.md`](./open-issues-tasks.md). П. 55 (retention) відкладено — рішення Р3.

## Вихідний стан (`main` після PR #75)

- `llm_text_usage`: `user_id` **NOT NULL**, три лічильники токенів `NOT NULL DEFAULT 0`, `feature` — enum `PROMPT_TEST` / `SUPPORT_CHAT` / `SUPPORT_QUERY_TRANSLATION`.
- Пишуть лише `supportService.openChat/chat` (`SUPPORT_CHAT`). Не пишуть: переклад запиту (`support-query-translation-service.ts`, своя feature існує), тест промпту (`PROMPT_TEST` існує), embeddings (feature немає; виклики `embed` / `embedBatch` у `support-embedding-service.ts` — пошук у чаті, індексація статті, `reindexAll` з адмінки й на старті).
- `mistralai-text-adapter.ts` не викликає `onComplete`, якщо провайдер не повернув usage (`hasUsage`), тож виклик зникає з обліку.
- `/admin/usage/text` і `/admin/usage/stats` віддають рядки як `unknown[]`; фронтенд-екрана для них немає.

## Рішення

1. **Міграція** (folder-per-migration, drizzle 1.0):
    - `prompt_tokens`, `completion_tokens`, `total_tokens` — `DROP NOT NULL`, `DROP DEFAULT`: `NULL` = провайдер не повідомив usage, `0` = справжній нуль;
    - `user_id` — `DROP NOT NULL`: індексація бази знань (на старті, `reindexAll`) — системні виклики без користувача;
    - `llm_text_feature` — `ADD VALUE 'SUPPORT_EMBEDDING'`.
      Наявні рядки не змінюються.
2. **`TokenUsage` з `null`:** `onComplete` викликається **завжди** після успішного виклику; адаптер без usage від провайдера передає `{ promptTokens: null, … }` і пише `warn`.
3. **Нові записи:** переклад → `SUPPORT_QUERY_TRANSLATION`; тест промпту → `PROMPT_TEST` (userId адміна); embeddings → `SUPPORT_EMBEDDING` (`model` — модель embeddings, токени з `usage` відповіді OpenAI, `completion_tokens` = `NULL`, `final_prompt` = вхідний текст; `userId` — користувач чату для пошуку, `NULL` для індексації).
4. **Агрегати:** `getTextStats` — `sum` ігнорує `NULL`, додається `callsWithoutUsage` (`count(*) filter (where total_tokens is null)`).
5. **Контракти:** тип рядка `/admin/usage/text` у `shared` з `number | null` для токенів і `string | null` для `userId`; рядок статистики з `callsWithoutUsage`. Валідація відповіді (`ResponseSchema`) лишається сумісною.

## Кроки

| Крок | Зміст                                                  | Задача |
| ---- | ------------------------------------------------------ | ------ |
| 1    | міграція + схема                                       | F11.1  |
| 2    | типи `number \| null` (репозиторій, контролер, shared) | F11.2  |
| 3    | агрегати з `NULL` і `callsWithoutUsage`                | F11.3  |
| 4    | облік перекладу і тесту промпту                        | F11.4  |
| 5    | облік embeddings                                       | F11.5  |
| 6    | провайдер без usage → `NULL` + `warn`                  | F11.6  |
| 7    | `ai.md`, `database.md`                                 | F11.D  |

## Ризики

- **Незворотність `DROP NOT NULL`** з наявними даними безпечна; зворотна міграція вимагала б заповнити `NULL`.
- **`ALTER TYPE … ADD VALUE`** не можна відкотити простим `DROP VALUE`; нове значення використовується лише кодом цієї фічі.
- **pg-тести** перевіряють міграцію на справжньому PostgreSQL (інфраструктура feat-036).
