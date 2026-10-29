# Перевірка відповідей

Маршрут може оголосити `ResponseSchema` — схему ArkType того, що повертає контролер. Крім документації маршрутів (`GET /<prefix>/doc/routes`), сервер може перевіряти за нею кожну відповідь під час роботи. Режим задає змінна `RESPONSE_VALIDATION`.

## Режими

| `RESPONSE_VALIDATION` | Невалідна відповідь                                                              |
| --------------------- | -------------------------------------------------------------------------------- |
| `strict`              | Клієнт отримує `500` з канонічним тілом `internal_error`, у лог пишеться `error` |
| `log`                 | Відповідь іде як є, у лог пишеться `warn`                                        |
| `off`                 | Перевірки немає                                                                  |

За замовчуванням: `strict` поза production, `off`, коли `APP_IS_PRODUCTION=true` (або `APP_ENV=production`/`prod`). Невідоме значення зупиняє старт сервера.

`RESPONSE_VALIDATION_SAMPLE_RATE` (`0`–`1`, default `1`) — частка відповідей, які перевіряються в режимі `log`. У `strict` перевіряється кожна відповідь, інакше `500` залежав би від випадку.

```dotenv
RESPONSE_VALIDATION=log
RESPONSE_VALIDATION_SAMPLE_RATE=0.1
```

Рекомендації: `strict` у локальній розробці, CI та e2e; `log` у staging і production, поки логи не стануть чистими; `strict` у production — лише окремим рішенням.

## Що саме перевіряється

Перевіряється **об'єкт, який повернув контролер, до JSON-серіалізації** — не JSON, який отримує клієнт. Тому схема з `Date` пропускає `Date`, хоча клієнт отримає ISO-рядок. Результат схеми ніколи не підміняє відповідь: морфи (`.pipe`) не змінюють те, що відправляється.

Перевірка не захищає від витоку зайвих полів: схеми відповідей не забороняють невідомі ключі, тож поле на кшталт хеша пароля пройде перевірку.

### HTTP

Перевірку виконує `checkHandlerResponse` у [server.ts](https://github.com/Blazheiko/vibe-template/blob/main/packages/backend/src/vendor/start/server.ts) одразу після контролера.

| Випадок                                                                                     | Перевіряється |
| ------------------------------------------------------------------------------------------- | ------------- |
| Контролер виконався й відповідь має тіло — з будь-яким статусом, напр. `GET /ready` → `503` | Так           |
| Middleware зупинив запит (`401`, `403`, `429`, CSRF), помилка валідації запиту              | Ні            |
| Контролер кинув виняток (відповідь формує обробник помилок)                                 | Ні            |
| Відповідь без тіла: `3xx` (зокрема OAuth-редиректи, `304`), `204`, `205`, порожній `2xx`    | Ні            |

Правило «є тіло чи ні» — одна функція `hasResponseBody()` у [response-body.ts](https://github.com/Blazheiko/vibe-template/blob/main/packages/backend/src/vendor/utils/network/response-body.ts), яку використовує і `sendResponse`.

Коли `strict` замінює відповідь на `500`, усі заголовки, які виставив контролер (`ETag`, `Content-Disposition` тощо), відкидаються: вони описували відхилену відповідь. Cookie залишаються, бо стан сесії на сервері вже змінено.

```json
{ "status": "error", "code": "internal_error", "message": "Internal Server Error" }
```

### WebSocket

[ws-api-dispatcher.ts](https://github.com/Blazheiko/vibe-template/blob/main/packages/backend/src/vendor/utils/routing/ws-api-dispatcher.ts) перевіряє пряму відповідь обробника. У `strict` невалідна відповідь стає:

```json
{
    "status": "error",
    "data": null,
    "error": { "code": "internal_error", "message": "Internal server error" }
}
```

Повідомлення, які обробник надсилає пізніше асинхронно, і broadcast не перевіряються.

## Логи та Sentry

Модуль [validate-response.ts](https://github.com/Blazheiko/vibe-template/blob/main/packages/backend/src/vendor/utils/validation/validate-response.ts) пише запис `Response does not match ResponseSchema`:

```json
{
    "route": "api/admin/usage/text",
    "transport": "http",
    "requestId": "…",
    "mode": "log",
    "issues": [{ "path": "data.total", "code": "domain", "expected": "a number" }],
    "suppressed": 0
}
```

- Лише шлях, код і очікуваний тип — без значень з відповіді, щоб у логи не потрапляли персональні дані.
- Один запис і одна подія Sentry (тег `response_validation`) на маршрут за хвилину; пропущені рахуються в `suppressed` наступного запису.
- Подію в Sentry надсилає модуль; сам лог позначено `sentrySkip`, тож подія не дублюється.

## Як це вбудовано

`routesHandler` у [router.ts](https://github.com/Blazheiko/vibe-template/blob/main/packages/backend/src/vendor/start/router.ts) один раз при старті створює для кожного маршруту `responseCheck` — функцію перевірки або `null` (режим `off` чи маршрут без `ResponseSchema`). Тип `NormalizedRouteItem` робить це поле обов'язковим, тож на запит у режимі `off` припадає одне порівняння з `null`.

## Вартість

Заміри на Apple M1 Pro, Node 24, валідна відповідь:

| Відповідь                    | Перевірка, µs | `JSON.stringify`, µs |
| ---------------------------- | ------------- | -------------------- |
| `GET /ping`                  | 0.06          | 0.09                 |
| Список користувачів, 50      | 0.29          | 8.2                  |
| Список користувачів, 1000    | 5.4           | 141                  |
| Використання AI, 1000 рядків | 16.6          | 403                  |

Для валідної відповіді перевірка коштує 3–5% від серіалізації. Невалідна відповідь дорожча (ArkType збирає опис помилок) — приблизно як сама серіалізація; для гарячих маршрутів у `log` знижуйте `RESPONSE_VALIDATION_SAMPLE_RATE`.
