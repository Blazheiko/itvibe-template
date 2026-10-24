# План: якість Support AI (feat-029, F12)

Пункти 43, 52, 54 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Roadmap: [F12](./open-issues-roadmap.md); задачі: F12.1–F12.5 у [`open-issues-tasks.md`](./open-issues-tasks.md).

## Вихідний стан (`main` після PR #77)

- `support-service.ts`: `const langNative = 'ru'` у `openChat` і `chat`. Мови в профілі (`users`) немає; фронтенд має i18n-локаль з `APP_LOCALE_CODES` (`shared/enums/languages.ts`), але WS-запити `support/support_open_chat` і `support/support_chat` її не передають (`SupportOpenChatInputSchema` порожня, `SupportChatInputSchema` — лише `message`, обидві `'+': 'reject'`).
- `schema.ts`: `vector(1536)`; `OPENAI_EMBEDDING_DIMENSIONS` читається як `Number(...)` без перевірки — інше значення зламає запис embedding.
- `reindexAll` шле всі активні статті одним `embedBatch`.
- `searchByEmbedding` без порогу відстані: у контекст LLM завжди йде до `limit` статей, навіть зовсім нерелевантних.
- `prompt-service.ts`: `Map` у пам'яті процесу без TTL; оновлення промпту на одному інстансі не видно на інших до рестарту.

## Рішення

1. **Мова (п. 52):** необов'язкове поле `language` (одне з `APP_LOCALE_CODES`) в обох WS-схемах; фронтенд передає поточну i18n-локаль. Бекенд: валідне `language` → воно, інакше `SUPPORT_DEFAULT_LANGUAGE` (новий env, за замовчуванням `en`, перевіряється на старті). Старі клієнти без поля працюють. Профільної мови немає — це окрема фіча, не тут.
2. **Розмірність (п. 54):** `OPENAI_EMBEDDING_DIMENSIONS` має дорівнювати розмірності колонки `EMBEDDING_COLUMN_DIMENSIONS = 1536` (константа поруч зі схемою); інакше `configError` → старт зупиняється з поясненням, що потрібна міграція колонки.
3. **Батчі (п. 54):** `SUPPORT_EMBEDDING_BATCH_SIZE` (default 50, ціле 1–2048); `reindexAll` викликає `embedBatch` по частинах.
4. **Поріг (п. 54):** `SUPPORT_SEARCH_MAX_DISTANCE` — косинусна відстань (`<=>`, 0…2), default `0.8`; статті далі порогу не потрапляють у контекст. Default **не відкалібровано** на реальних embeddings (немає ключа OpenAI у середовищі перевірки) — у документації вказано, як підібрати.
5. **Кеш промптів (п. 43):** `PROMPT_CACHE_TTL_MS` (default 60 000). `get*` лишаються синхронними: прострочений кеш віддає поточне значення й запускає фонове перечитування (одне одночасно, помилка — `warn`, старі значення лишаються). `update()` на своєму інстансі оновлює кеш одразу. Інвалідація між інстансами (pub/sub) — поза фічею: інші інстанси бачать зміну із затримкою ≤ TTL.

## Кроки

| Крок | Зміст                                       | Задача |
| ---- | ------------------------------------------- | ------ |
| 1    | мова з запиту / `SUPPORT_DEFAULT_LANGUAGE`  | F12.1  |
| 2    | перевірка розмірності на старті             | F12.2  |
| 3    | батчі `reindexAll`                          | F12.3  |
| 4    | поріг відстані                              | F12.4  |
| 5    | TTL кешу промптів                           | F12.5  |
| 6    | `ai.md`, `configuration.md`, `.env.example` | F12.D  |
