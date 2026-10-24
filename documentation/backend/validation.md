# Валідація

Вхідні дані (тіло HTTP-запиту, query, payload WS-повідомлення та сам конверт WS-повідомлення) перевіряються схемами ArkType (`@arktype/type`). Ядро сервера (`vendor/`) працює не з ArkType, а з нейтральним контрактом `Validator<T>`; конкретну бібліотеку підключає адаптер в `app/validate`. Загальний порядок обробки запиту описано в [Життєвому циклі запиту](/backend/request-lifecycle), поля маршруту — в [Маршрутизації та middleware](/backend/routing-middlewares).

## Контракт `Validator<T>`

[vendor/contracts/validator.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/contracts/validator.ts):

```ts
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; messages: string[] }

export interface Validator<T> {
    validate(input: unknown): ValidationResult<T>
    describe?(): unknown
}

export type InferPayload<V> = V extends Validator<infer T> ? T : unknown
```

- `validate` синхронний і не кидає винятків — повертає результат-об'єднання.
- `describe` необов'язковий: повертає «сиру» схему для генерації документації маршрутів.

### ArkType-адаптер

[app/validate/adapters/arktype-adapter.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/validate/adapters/arktype-adapter.ts) — `arkValidator(schema)` викликає схему, і якщо результат — `type.errors`, повертає `{ ok: false, messages: [summary] }` (тобто **одне** повідомлення — `summary` ArkType). `describe()` повертає саму схему.

Активний движок фіксується одним рядком у [app/validate/index.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/validate/index.ts):

```ts
export { arkValidator as defaultValidator, arkValidator } from './adapters/arktype-adapter.js'
```

## Як маршрут отримує валідатор

У маршрутах передається **схема**, а не валідатор: `defineRoute` / `defineWsRoute` самі загортають її через `defaultValidator` ([define-route.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/routing/define-route.ts), [define-ws-route.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/routing/define-ws-route.ts)). Вручну обгортати `arkValidator(...)` у файлах маршрутів не потрібно.

- `validator` — схема тіла (HTTP) або payload (WS). На HTTP він дозволений лише для `post`, `put` і `patch`; на `get`/`delete` дає помилку типів і помилку на старті, бо тіло там не читається ([Методи і тіло запиту](/backend/routing-middlewares#методи-і-тіло-запиту)). Без `Content-Type` і без тіла валідується `{}`, тож handler з `validator` не отримує `payload = null` (крім `octet`-маршрутів).
- `queryValidator` — схема query (лише HTTP). До неї `defineRoute` застосовує `onUndeclaredKey("reject")` (зайві ключі → помилка) або, з `queryAllowExtra: true`, `onUndeclaredKey("delete")` (зайві ключі видаляються). `queryArrays` перелічує ключі, які можуть повторюватися (збираються в `string[]`); див. [flatten-query.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/validation/flatten-query.ts).

Приклад з [http-routes.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/routes/http-routes.ts):

```ts
defineRoute({
    url: '/login',
    method: 'post',
    handler: AuthController.login.bind(AuthController),
    validator: LoginInputSchema,
    ResponseSchema: ResponseSchemas.LoginResponseSchema,
    description: 'Login a user by email or phone identifier',
})
```

### Виведення типів

`defineRoute` виводить тип `payload` з `Type<T>` схеми тіла, а тип `query` — зі схеми query (або `null`, якщо `queryValidator` не задано). Для обробників, оголошених окремо (методи контролерів), є хелпер `InferQuery<typeof Schema>` в [app/validate/index.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/validate/index.ts); на рівні контракту — `InferPayload<V>`. У shared-схемах тип зазвичай експортується поруч зі схемою через `typeof Schema.infer` / `["inferIn"]`.

## Де виконується валідація

Усі шляхи зводяться до [validateRoutePayload](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/validation/validate-route-payload.ts): виклик `validator.validate`, а при `ok: false` — `throw new ValidationError(messages)`.

```mermaid
flowchart LR
    A[HTTP запит] --> B[validateQuery]
    B --> C[readAndParseBody]
    C --> D[validateRoutePayload]
    E[WS повідомлення] --> F[wsMessageValidator]
    F --> G[ws-api-dispatcher]
    G --> D
    D -->|ok| H[middleware та handler]
    D -->|ValidationError| I[validation_failed]
```

- **HTTP query** — `validateQuery` у [server.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/start/server.ts), до читання тіла. Без `queryValidator` → `httpData.query === null`.
- **HTTP тіло** — `readAndParseBody` у тому ж файлі: після парсингу, якщо є `route.validator` і payload не `null`. Без валідатора payload стає `null` (див. [Життєвий цикл](/backend/request-lifecycle)).
- **WS конверт** — [ws-message-validator.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/validate/ws-message-validator.ts) (`{ payload, event, timestamp }`) реєструється в [app/start/index.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/start/index.ts) через `registerWsMessageValidator` і викликається в `onMessage` [ws-handlers.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/network/ws-handlers.ts).
- **WS payload** — у [ws-api-dispatcher.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/routing/ws-api-dispatcher.ts) після rate limit, до middleware. Деталі — [WebSocket](/backend/websocket).

## Схеми

| Місце                                                                                                                                                | Призначення                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [packages/shared/src/schemas](https://github.com/Blazheiko/itvibe-template/tree/main/packages/shared/src/schemas)                                    | основні схеми вводу (auth, main, support, push-subscription, query, ws…), спільні для frontend і backend |
| [app/validate/schemas/common](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/validate/schemas/common/pagination.ts) | лише реекспорт пагінаційних/дата-схем з `shared/schemas`                                                 |
| [app/validate/schemas/query](https://github.com/Blazheiko/itvibe-template/tree/main/packages/backend/src/app/validate/schemas/query)                 | містить лише тест виведення типів (`arktype-inference.spec.ts`)                                          |

Приклад схеми ([shared/src/schemas/auth/register.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/shared/src/schemas/auth/register.ts)):

```ts
import { type } from '@arktype/type'

export const RegisterInputSchema = type({
    name: 'string >= 1 & string <= 100',
    email: 'string.email & string <= 255',
    password: 'string >= 8 & string <= 32',
    token: 'string <= 60',
    '+': 'reject',
})

export type RegisterInput = (typeof RegisterInputSchema)['inferIn']
```

`'+': 'reject'` забороняє невідомі ключі. Query-схеми приходять рядками, тому використовують морфи-парсери, напр. `type('string.integer.parse').pipe(type('number > 0'))` у [query/common.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/shared/src/schemas/query/common.ts) (там же коментар про cast-обхід для дефолтів у кортежах ArkType).

## Checkers: заголовки, cookies, параметри

[app/validate/checkers](https://github.com/Blazheiko/itvibe-template/tree/main/packages/backend/src/app/validate/checkers) — не схеми, а regex/довжина для «сирого» транспорту. Використовуються в [http-request-handlers.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/network/http-request-handlers.ts):

| Checker             | Правила                                                                                     | Поведінка при порушенні                            |
| ------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `validateHeader`    | ім'я `^[a-zA-Z0-9\-_]+$`, 1–256 символів; значення — друковані ASCII і таб, ≤ 3072          | заголовок мовчки відкидається (`getHeaders`)       |
| `validateCookie`    | ім'я/значення за regex, ліміт `appConfig.reasonableCookieLimit`, коректне percent-кодування | cookie мовчки відкидається (`parseCookies`)        |
| `validateParameter` | `^[a-zA-Z0-9\-_./]*$`, ≤ 256 символів                                                       | `ParameterValidationError` → **400** `bad_request` |

## Формат помилок

[ValidationError](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/validate/errors/validation-error.ts) має `code = "validation_failed"`, `statusCode = 422` і `messages: string[]`.

HTTP-відповідь (обробник помилок у [server.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/start/server.ts)) — статус **422**:

```json
{
    "status": "error",
    "code": "validation_failed",
    "message": "Validation failure",
    "details": { "kind": "validation", "messages": ["..."] }
}
```

Помилка параметра шляху — статус **400**, `code: "bad_request"`, `details.kind: "parameter_validation"`, `details.parameter`.

У WS (і для конверта, і для payload) повертається `status: "error"` з конвертом `error`, створеним `createWsErrorEnvelope("validation_failed", "Validation failure", { details: { kind: "validation", messages } })`. HTTP-статусу немає. Формат конверта — див. [WebSocket](/backend/websocket).

## Схеми відповідей (`ResponseSchema`)

`ResponseSchema` (тип `BaseType` з ArkType у [types.d.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/types/types.d.ts)) **у рантаймі не перевіряється**: він лише копіюється в маршрут у [router.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/start/router.ts) і читається тільки [serialize-routes.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/routing/serialize-routes.ts) для doc-сторінки маршрутів (`outputSchema`). Схеми відповідей беруться з `shared/responses`.

## Що лишилося ArkType-специфічним

Рішення про абстракцію валідатора записане в [ADR 0001](https://github.com/Blazheiko/itvibe-template/blob/main/docs/adr/0001-validator-abstraction.md) і реалізоване: `vendor/start/server.ts` і `ws-api-dispatcher.ts` працюють тільки з `Validator<T>`. Свідомо прив'язаними до ArkType лишаються:

- `ResponseSchema?: BaseType` у `vendor/types/types.d.ts`;
- `defineRoute`/`defineWsRoute` і `InferQuery` типізовані через `Type` з `@arktype/type`;
- doc-серіалізація: `serialize-routes.ts` бере `validator.describe()` і приймає лише ArkType (`isArkType`, з `TODO(validation-docs)` для інших), перетворення робить [serialize-ark-schema.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/vendor/utils/tooling/serialize-ark-schema.ts);
- схема WS-конверта в `ws-message-validator.ts`.

::: warning План
Не реалізовано з початкового плану (див. ADR 0001): експорт `InputSchema` з `app/validate/index.ts` (§3.6); демонстраційний `nativeValidator(predicate)` (§9); перенесення `RouteConfig`/`ResponseSchema` з `vendor/types` в `app/routing/types.ts` (§5.6, окремий PR).
:::

## Рецепт: валідація для нового маршруту

1. Опишіть схему в `packages/shared/src/schemas/<домен>/` через `type({...})` з `'+': 'reject'` і експортуйте її разом з типом; додайте в `index.ts` пакета.
2. Передайте схему в `validator` (і/або `queryValidator`) у `defineRoute`/`defineWsRoute` — не обгортайте вручну.
3. Типізуйте handler: тип payload виводиться автоматично; для окремо оголошених обробників — `InferQuery<typeof Schema>` або тип зі схеми.
4. Перевірте 422 з `validation_failed` на невалідному тілі. Повний сценарій — [Додавання фічі](/backend/adding-a-feature).

### Заміна бібліотеки валідації

Код це підтримує лише як **глобальну** заміну: новий адаптер, що реалізує `Validator<T>`, і зміна експорту `defaultValidator` в `app/validate/index.ts`. Але доведеться також переписати всі схеми в `shared`, типи `defineRoute`/`defineWsRoute`/`InferQuery` (вони на `Type` ArkType), `ws-message-validator.ts` і doc-серіалізацію. Проєкт використовує один валідатор: маршрути передають сиру схему (`validator: SomeSchema`), обгортку робить `defineRoute`, а змішувати движки по маршрутах не можна ([ADR 0001](https://github.com/Blazheiko/itvibe-template/blob/main/docs/adr/0001-validator-abstraction.md)).
