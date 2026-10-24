# План: надійність AI-викликів (feat-027, F10)

Пункти 23, 50, 51 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Roadmap: [F10](./open-issues-roadmap.md); задачі: F10.1–F10.5 у [`open-issues-tasks.md`](./open-issues-tasks.md).

## Вихідний стан (`main` після PR #73)

- `ai-provider.ts`: `AI_TEXT_DRIVER` ∉ {`openai`, `xai`} мовчки дає Mistral; значення ніде не валідується.
- Адаптери без timeout і без скасування: OpenAI — власний `fetch` (SSE), xAI — `ai` SDK `streamText`, Mistral — `@mistralai/mistralai` `chat.stream`, embeddings — `openai` SDK `embeddings.create`.
- `prompt-controller.ts` → `callLlm`: спершу `textAdapter.streamText`, а при будь-якій помилці — **власний `fetch` до OpenAI** з `throw new Error(...)`; контролер ловить усе й віддає `500 internal_error` «LLM call failed».
- HTTP-контекст не має `AbortSignal`: `server.ts` знає про `res.onAborted` лише через `{ aborted }`. WS-контекст теж не має сигналу; закриття з'єднання не впливає на AI-виклик, що триває (Support AI чат).

## Рішення

1. **`AI_TEXT_DRIVER`** ∈ {`openai`, `xai`, `mistral`}; невідоме значення — помилка `validateRuntimeConfig()` на старті. Default лишається `openai`.
2. **Timeout:** `AI_REQUEST_TIMEOUT_MS` (default 60 000, ціле ≥ 1000) у `config/ai.ts` з `configError`. Helper `aiRequestSignal(signal?)` = `AbortSignal.any([signal, AbortSignal.timeout(ms)])`.
3. **Сигнал у контекстах:** `HttpContext.signal` (`AbortController`, що спрацьовує в наявному `res.onAborted`); `WsContext.signal` — сигнал з'єднання з `ws-connection-signal.ts` (WeakMap за `ws`, `abort` у `onClose`). Обидва поля обов'язкові в типах, тож handler'и можуть їх просто передати.
4. **Адаптери:** `TextStreamOptions.signal?` / `EmbedOptions.signal?`; кожен адаптер передає `aiRequestSignal(opts.signal)` у свій транспорт (`fetch` `signal`, `ai` `abortSignal`, Mistral `fetchOptions.signal`, OpenAI SDK `{ signal }`).
5. **Помилки провайдера:** нові `AppError` `UpstreamError` → `502 upstream_error` і `UpstreamTimeout` → `504 upstream_timeout` (коди додаються в `shared` `ErrorCode`). Текст провайдера у відповідь не потрапляє, лише в лог.
6. **`prompt-controller`:** `promptService.test(type, message, signal)` у сервісі через `textAdapter`, без власного `fetch` і без fallback на сирий OpenAI. Не налаштований провайдер → `503 service_unavailable` («AI provider is not configured»). Скасований клієнтом запит відповіді не отримує (як і зараз при `aborted`).
7. **Support AI (WS):** `support-llm-service` приймає `signal` з `WsContext` — закриття з'єднання скасовує генерацію.

## Кроки

| Крок | Зміст                                                | Задача |
| ---- | ---------------------------------------------------- | ------ |
| 1    | валідація `AI_TEXT_DRIVER`                           | F10.1  |
| 2    | `AI_REQUEST_TIMEOUT_MS`, `aiRequestSignal`           | F10.2  |
| 3    | сигнал в адаптерах                                   | F10.3  |
| 4    | `HttpContext.signal`, `WsContext.signal`, Support AI | F10.4  |
| 5    | `prompt-controller` через сервіс, 502/504/503        | F10.5  |
| 6    | `ai.md`, `configuration.md`, `.env.example`          | F10.D  |

## Ризики

- **Нові коди помилок у `shared`** — додаткові значення `ErrorCode`; фронтенд обробляє невідомі коди як загальну помилку.
- **Таймаут для довгих генерацій:** 60 с за замовчуванням має покривати потоковий чат підтримки; значення налаштовується.
