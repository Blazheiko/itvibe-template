# Validator Abstraction Plan

Декаплинг ядра фреймворка (`src/vendor/`) от конкретной реализации валидатора (сейчас — `@arktype/type`).

> **Scope.** Архитектурный рефакторинг — только runtime input-validation (HTTP + WS).
> Doc tooling (`serialize-routes.ts`, `serialize-ark-schema.ts`) **архитектурно не рефакторится** и остаётся ArkType-specific — это его единственный потребитель ArkType в `vendor/`. Однако файл `serialize-routes.ts` получает **минимальную адаптацию**: переход с прямого чтения `obj.validator` на `obj.validator?.describe?.()`, потому что после §3.2 поле `validator` больше не является ArkType-объектом. Это не «рефакторинг doc'ов», а вынужденная правка точки соприкосновения.
> `ResponseSchema` остаётся `BaseType` и в этот рефакторинг не входит вовсе — см. §8.

---

## 1. Проблема

ArkType сейчас протекает в нескольких слоях фреймворка:

| Файл | Что протекает |
|---|---|
| `src/vendor/start/server.ts:71` | `import { type } from "@arktype/type"` |
| `src/vendor/start/server.ts:263-279` | прямой вызов схемы `validate(result.payload)` + `instanceof type.errors` |
| `src/vendor/utils/routing/ws-api-dispatcher.ts:72-91` | то же для WebSocket-сообщений |
| `src/vendor/types/types.d.ts:3, 63, 72, 135, 200, 223, 227, 233, 240, 242` | `BaseType` зашит в `HttpContext.validator` (63), `WsContext.validator` (72), `HttpData.validator` (135), `RouteConfig.validator` (227), `RouteConfig.ResponseSchema` (233), `InferPayload` и generic-параметры `defineRoute` |
| `src/vendor/utils/routing/define-route.ts:12`, `define-ws-route.ts:12` | generic-параметр `TValidator extends BaseType` |
| `src/vendor/utils/routing/serialize-routes.ts:1, 56-62` | doc-сериализация полагается на структуру ArkType-объекта (`expression`, `json`) |

---

## 2. Цель

После рефакторинга:

- `src/vendor/start/server.ts` и `ws-api-dispatcher.ts` не импортируют `@arktype/type` и не знают про `BaseType`.
- `RouteItem.validator` и `RouteConfig.validator` имеют тип `Validator<unknown> | undefined` — нейтральный контракт.
- Контракт `Validator<T>` живёт в **нейтральном слое**, не в `app/` (см. §3.1).
- ArkType-специфичный runtime-код локализован в одном файле-адаптере; остальной backend вызывает только публичную обёртку из `#app/validate/index.js`. `serialize-routes.ts` остаётся отдельным ArkType-specific tooling-исключением для doc-страницы.
- Поля `validator` из `HttpContext`, `WsContext`, `HttpData` удаляются целиком (см. §3.4) — они нигде не читались.
- Inference типа payload в `defineRoute`/`defineWsRoute` сохраняется (см. §5.2): handler по-прежнему получает строго типизированный `HttpContext<T>`, где `T` выводится из schema-типа, экспортируемого `#app/validate/index.js`.

**Важная честная оговорка про `BaseType` в `vendor/types/types.d.ts`.** В текущем коде он используется не только для `validator`, но и для `RouteConfig.ResponseSchema` (`types.d.ts:233`). `ResponseSchema` остаётся ArkType-specific и в этот рефакторинг не входит — следовательно, `import type { BaseType } from "@arktype/type"` в `types.d.ts` **остаётся**, но сужается ровно до `ResponseSchema`-поля. Полное удаление `BaseType` из `vendor/types` — это отдельная задача (см. §8). В рамках этого PR мы убираем `BaseType` только из контекстов, `HttpData`, `RouteItem.validator`, `RouteConfig.validator` и из generic-параметров `define*Route`.

---

## 3. Архитектурные принципы

### 3.1. Контракт — в нейтральный слой

**Не** класть `Validator<T>` в `src/app/validate/` — иначе `vendor` начнёт зависеть от `app`, что архитектурно не лучше прежней зависимости от `@arktype/type`.

Контракт — в нейтральном модуле, на который вправе ссылаться оба слоя:

```
src/vendor/contracts/validator.ts
```

(Альтернатива — `src/contracts/validator.ts` на верхнем уровне, если хотим подчеркнуть, что контракты не принадлежат vendor'у. Я предпочитаю первый вариант: `vendor/contracts/` уже физически в ядре, читается как «public types of the framework».)

```ts
// src/vendor/contracts/validator.ts
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; messages: string[] };

export interface Validator<T> {
  /** НИКОГДА не бросает: все ошибки идут через ok:false. */
  validate(input: unknown): ValidationResult<T>;

  /**
   * Опционально: вернуть нативную схему для tooling-сценариев (doc-страница).
   * Адаптеры без structural-introspection не реализуют этот метод —
   * соответствующие маршруты просто не попадают в doc-сериализацию.
   */
  describe?(): unknown;
}

export type InferPayload<V> = V extends Validator<infer T> ? T : unknown;
```

Эта форма — **единственное** определение `Validator<T>` во всём документе. Везде ниже под этим типом подразумевается именно она (с опциональным `describe`).

Зависимости после рефакторинга:

```
vendor/start/server.ts        → vendor/contracts/validator.ts  (только интерфейс)
vendor/utils/routing/...      → vendor/contracts/validator.ts
app/validate/adapters/...     → vendor/contracts/validator.ts  +  @arktype/type
app/validate/index.ts         → app/validate/adapters/...
app/routing/define-route.ts   → app/validate/index.ts  +  vendor/types/types.ts
```

`vendor` нигде не упоминает ни `app/`, ни `@arktype/type`.

### 3.2. Конвенция вызова: backend вызывает только validate-wrapper, а не ArkType напрямую

ArkType используется только внутри adapter-layer (`src/app/validate/adapters/arktype-adapter.ts`).
Во всех остальных местах backend-кода используется **публичная validate-обёртка** из `src/app/validate/index.ts`.

Это значит:

- маршруты передают в `defineRoute` schema-объект как и раньше;
- `defineRoute` / `defineWsRoute` **не импортируют** `arkValidator` и `BaseType` напрямую;
- вместо этого они импортируют из `#app/validate/index.js`:
  - `defaultValidator(...)` — обёртку над активным движком;
  - `type InputSchema<T>` — тип schema-входа для текущего движка.

Для текущей реализации `InputSchema<T>` внутри `index.ts` просто реэкспортит ArkType-тип из adapter-layer, но routing-слой этого уже не знает.

```ts
// src/app/validate/index.ts
export { arkValidator as defaultValidator, arkValidator } from "./adapters/arktype-adapter.js";
export type { InputSchema } from "./adapters/arktype-adapter.js";
```

Маршрут по-прежнему выглядит так:

```ts
// ✅ В маршруте:
defineRoute({ validator: LoginInputSchema, ... })

// ❌ Backend-код не должен напрямую импортировать ArkType adapter:
defineRoute({ validator: arkValidator(LoginInputSchema), ... })
```

Это работает корректно потому, что в проекте принят single-engine (§3.6): движок ровно один, и `defineRoute` имеет право знать только про `defaultValidator` из validate-wrapper, но не про ArkType напрямую.

Соответственно `defineRoute` и `defineWsRoute`:
- на вход принимают `validator?: InputSchema<T>` (schema-тип, экспортируемый validate-wrapper);
- внутри оборачивают её в `defaultValidator(schema)` и кладут в `RouteItem.validator: Validator<unknown>`;
- наружу (в `vendor/server.ts`, `ws-api-dispatcher.ts`) отдают уже только нейтральный `Validator<T>`-контракт;
- **не содержат** `isArkType`-эвристик и throw-веток — на входе TypeScript уже сужает тип до `InputSchema<T>`.

`define-route.ts` и `define-ws-route.ts` переезжают из `src/vendor/utils/routing/` в `src/app/routing/` (вариант C из исходного плана). Это даёт им право импортировать validate-wrapper без нарушения слоёв: `app/routing` → `app/validate` — нормальное направление зависимостей.

```
вход defineRoute              внутри defineRoute       выход (RouteItem)        потребители
────────────────────────────────────────────────────────────────────────────────────────────
schema (InputSchema<T>)   ────→  defaultValidator(...) ──→  validator:Validator<T>  ┌─→ vendor/server.ts
                                                                                  │   (видит только
                                                                                  │    Validator<T>)
                                                                                  │
                                                                                  └─→ doc-сериализатор
                                                                                      (через describe?(),
                                                                                       см. §3.3)
```

#### Почему так, а не явный `arkValidator(...)` в маршрутах

При выбранной single-engine конвенции (§3.6) разработчик в маршруте всё равно мог бы написать только `arkValidator(...)` — другого адаптера не существует. Это значит, что вызов `arkValidator(...)` повторялся бы в ~80 маршрутах **без полезной информации** — он не добавляет выбора, не добавляет читаемости (схема и так ArkType — это видно по импорту), а только увеличивает шум.

Перенос обёртывания в `defineRoute` устраняет это дублирование: маршрут описывает «что валидировать», а «какой adapter-wrapper применить» — общий механизм routing-слоя.

Если когда-нибудь в проекте захочется добавить второй адаптер для редких случаев (например, `nativeValidator(predicate)` для `octet-stream`), то — но только тогда — `defineRoute` обзаведётся вторым опциональным параметром, и тот один-два маршрута явно его укажут. Сейчас такой потребности нет, и закладывать её преждевременно — over-engineering.

### 3.3. Doc-сериализация — отдельный канал

`serialize-routes.ts:56` сейчас вытаскивает `inputSchema` напрямую из ArkType-объекта. После обёртки `obj.validator` будет `Validator<T>`-адаптером — без поля `expression`. **Без явного канала doc-страница сломается.**

Два рабочих варианта:

#### A. Отдельное поле `requestSchema` в RouteConfig

```ts
defineRoute({
  url: "/login",
  method: "post",
  validator: LoginInputSchema,
  requestSchema: LoginInputSchema,   // <- ArkType, для docs
  ...
})
```

`serializeRoutes` читает `obj.requestSchema`, не трогая `validator`. Дублирование, но явное разделение runtime ↔ docs.

#### B. Опциональный `describe()` на адаптере (выбран)

`Validator<T>.describe?()` уже зафиксирован в §3.1. Адаптер реализует его, doc-сериализатор читает:

```ts
// в адаптере:
type InputSchema<T> = BaseType<T, unknown>;

function arkValidator<T>(schema: InputSchema<T>): Validator<T> {
  return { validate(...) { ... }, describe: () => schema };
}

// в serialize-routes.ts:
const native = obj.validator?.describe?.();
if (isArkType(native)) result.inputSchema = serializeArkSchema(native);
```

В маршрутах нет повторов, doc-сериализатор остаётся единственным потребителем ArkType-структуры (а не `validate()`-контракта), `describe()` опционален и существует только для tooling-сценариев.

### 3.4. `validator` из контекста и data — удалить, не ретипизировать

В текущем `types.d.ts` поле `validator` присутствует в трёх местах:

| Поле | Линия | Кто читает |
|---|---|---|
| `HttpContext.validator` | `types.d.ts:63` | никто — write-only |
| `WsContext.validator` | `types.d.ts:72` | никто — write-only |
| `HttpData.validator` | `types.d.ts:135` | никто — write-only |

(В `WsData` поля `validator` нет — оно живёт только в `WsContext`.)

Все три — write-only: пробрасываются из `server.ts:480` / `ws-api-dispatcher.ts` / `http-context.ts:30`, но обработчики их не читают (проверено grep'ом по `httpData.validator` / `context.validator`).

Решение: **удалить эти три поля целиком**, не пытаясь поменять тип. Меньше публичной поверхности, меньше легаси.

(`RouteItem.validator` остаётся — это уже не контекст, а описание маршрута, и `server.ts` / `ws-api-dispatcher.ts` действительно его читают.)

### 3.6. Конвенция: один валидатор на весь проект

> **TODO для реализации:** перенести этот пункт (в более коротком виде) в `packages/backend/README.md` рядом с разделом «Validation (ArkType)». Команда должна видеть конвенцию без чтения внутренних docs.

В проекте используется **ровно один движок схем — ArkType**. Абстракция `Validator<T>` существует не для того, чтобы смешивать движки в разных маршрутах, а для того, чтобы:

- `vendor/` не зависел от конкретной библиотеки;
- замена движка (если когда-нибудь произойдёт) была локализована в одном файле-адаптере;
- упростить мокирование в тестах.

#### Правила

1. **Все маршруты валидируются через ArkType** (`type({...})` из `@arktype/type`), но backend-код вне adapter-layer не работает с ArkType напрямую. В маршрут передаётся schema текущего движка; `defineRoute`/`defineWsRoute` сами оборачивают её через `defaultValidator(...)` из `#app/validate/index.js` (см. §3.2 и §5.2).
2. **Не вводить второй движок схем** (Zod, Valibot, Yup, ...) для отдельных маршрутов. Если возникает соблазн — это сигнал отрефакторить общую схему, а не плодить движки.
3. **Если в редких случаях нужна не-ArkType валидация** (например, для `octet-stream` или сырого `text/plain`), `defineRoute` обзаведётся вторым опциональным параметром в день, когда такой кейс реально появится. Сейчас этого нет — закладывать преждевременно не нужно.
4. **Смена движка — глобальная операция**, а не «один маршрут на Zod в порядке эксперимента». Делается отдельным PR: пишется новый адаптер, в `src/app/validate/index.ts` меняется `defaultValidator` и `InputSchema`, переписываются схемы, backend-код за пределами adapter-layer ArkType не трогает.

#### Почему не `validatorName` в конфиге

Идея «выбирать адаптер по имени из конфига» обсуждалась и отклонена:

- Конфиг не помогает мигрировать — схемы в коде остаются в синтаксисе того движка, который выбран;
- TypeScript не выводит payload-тип через runtime-конфиг, handler деградирует до `unknown` payload;
- Перекладывает компайл-тайм-выбор в рантайм без новой информации (форма схемы и так известна по объекту);
- Тихие ошибки: попадание чужой схемы в активный адаптер ломается без понятного сообщения.

Вместо конфига — **явный default-экспорт** в `src/app/validate/index.ts`:

```ts
// единственное место, где зафиксирован движок проекта
export { arkValidator as defaultValidator } from "./adapters/arktype-adapter.js";
export type { InputSchema } from "./adapters/arktype-adapter.js";
```

Замена движка завтра = поменять одну строку в `index.ts` плюс переписать схемы. Конфиг в этом не помогает.

### 3.5. WS — тем же шагом, что и HTTP

`ws-api-dispatcher.ts:72-91` имеет ту же ArkType-зависимость. Если HTTP мигрирует, а WS остаётся — получаем неконсистентное состояние, в котором абстракция уже есть, а часть кодовой базы её игнорирует.

**HTTP и WS обновляются в одном PR/коммите.** План §6 это отражает.

---

## 4. Файловая структура после рефакторинга

```
src/
├── vendor/
│   ├── contracts/
│   │   └── validator.ts                 # NEW: Validator<T>, ValidationResult<T>, InferPayload<V>
│   ├── start/server.ts                  # знает только Validator<T> из contracts
│   ├── utils/routing/
│   │   ├── ws-api-dispatcher.ts         # знает только Validator<T>
│   │   └── serialize-routes.ts          # читает validator.describe?(), не предполагает ArkType API
│   └── types/types.d.ts                 # BaseType остаётся ради ResponseSchema (см. §5.6); validator выпиливается из контекстов и HttpData
├── app/
│   ├── validate/
│   │   ├── index.ts                     # public wrapper API: defaultValidator, InputSchema
│   │   ├── adapters/
│   │   │   └── arktype-adapter.ts       # arkValidator(schema)  — единственный импорт @arktype/type
│   │   ├── checkers/                    # как сейчас
│   │   ├── errors/                      # как сейчас (ValidationError)
│   │   └── schemas/                     # как сейчас
│   └── routing/                         # NEW: переезд из vendor/utils/routing/
│       ├── define-route.ts              # на входе InputSchema<T>, внутри defaultValidator(...), на выходе Validator<T>
│       └── define-ws-route.ts
```

---

## 5. Изменения в коде

### 5.1. ArkType-адаптер

```ts
// src/app/validate/adapters/arktype-adapter.ts
import { type, type BaseType } from "@arktype/type";
import type { Validator, ValidationResult } from "#vendor/contracts/validator.js";

export type InputSchema<T> = BaseType<T, unknown>;

export function arkValidator<T>(schema: InputSchema<T>): Validator<T> {
  return {
    validate(input: unknown): ValidationResult<T> {
      const result = (schema as unknown as (i: unknown) => unknown)(input);
      if (result instanceof type.errors) {
        const summary =
          typeof result === "object" &&
          result !== null &&
          "summary" in result &&
          typeof result.summary === "string"
            ? result.summary
            : "";
        return { ok: false, messages: [summary] };
      }
      return { ok: true, value: result as T };
    },
    describe: () => schema,
  };
}
```

### 5.2. `defineRoute` (живёт в `app/routing/`)

Главная цель этого блока — **сохранить текущий type inference**: handler получает `HttpContext<T>`, где `T` выводится из schema-типа, экспортируемого validate-wrapper. Маршруты пишут `validator: LoginInputSchema` (см. §3.2), а `defineRoute` оборачивает схему в `defaultValidator` сам.

#### 5.2.1. Сигнатура

Два требования для типов входа:

1. **Не дублировать поля** `method`, `middlewares`, `rateLimit`, `allowedContentTypes`, `description`, `parametersKey`, `requestBody`, `groupRateLimit`, `ResponseSchema` — это всё уже описано в `RouteConfig` (`types.d.ts:223-236`) с правильными типами (`Method`, `BodyKind[]`, `RateLimit`, ...). Любая ручная копия этих полей рискует разойтись с источником и ослабить compile-time проверки (например, `allowedContentTypes: string[]` пропустит произвольные строки вместо `BodyKind`-литералов).
2. **`handler`** должен использовать существующий тип `HttpHandler<TPayload>` (`types.d.ts:211`), а не обычную функцию. `HttpHandler` уже содержит bivariance hack (`types.d.ts:204-206`), без которого контроллерные методы через `.bind(SomeController)` не проходят typecheck — параметры функций контравариантны, и `HttpContext<LoginInput>` не присваивается в слот `HttpContext<unknown>` без этого хака.

Решение — деривировать `RouteConfigInput` из `RouteConfig` через `Omit`, заменив только `validator`-поле и добавив `handler`:

```ts
// src/app/routing/define-route.ts
import { defaultValidator, type InputSchema } from "#app/validate/index.js";
import type { HttpHandler, RouteConfig, RouteItem } from "#vendor/types/types.js";

// Извлекаем payload-тип из schema-типа текущего validate-wrapper.
type InferSchema<S> = S extends InputSchema<infer T> ? T : unknown;

// Все поля RouteConfig сохраняются автоматически (Method, BodyKind[], RateLimit, …).
// Меняем только validator (на ArkType-схему) и добавляем handler.
type DefineRouteInput<TSchema extends InputSchema<unknown> | undefined> =
  Omit<RouteConfig, "validator"> & {
    validator?: TSchema;
    handler: HttpHandler<InferSchema<TSchema>>;
  };

export function defineRoute<
  TSchema extends InputSchema<unknown> | undefined,
>(config: DefineRouteInput<TSchema>): RouteItem {
  return {
    ...config,
    validator:
      config.validator !== undefined ? defaultValidator(config.validator) : undefined,
  } as RouteItem;
}
```

Что это даёт:

- `method: Method`, `allowedContentTypes?: BodyKind[]`, `rateLimit?: RateLimit`, `middlewares?: string[]`, `description?: string`, `parametersKey?: string[]`, `requestBody?: RequestSchema`, `groupRateLimit?: RateLimit`, `ResponseSchema?: BaseType` — наследуются из `RouteConfig` без дублирования. Типы остаются ровно теми, что в `vendor/types`.
- При любом изменении `RouteConfig` в `vendor/types/` `DefineRouteInput` автоматически подхватит новое поле с правильным типом — нет риска расхождения.
- Single source of truth для конфигурации маршрута — это `RouteConfig`. `DefineRouteInput` — лишь проекция «как маршрут описывается на стороне разработчика», отличающаяся от runtime-формы только в двух точках (validator и handler).

Контроллер не меняет ничего — продолжает работать через `.bind(...)`:

```ts
defineRoute({
  url: "/login",
  method: "post",
  validator: LoginInputSchema,                          // InputSchema<LoginInput>
  handler: AuthController.login.bind(AuthController),   // HttpHandler<LoginInput>
})
```

`HttpContext<InferSchema<TSchema>>` внутри `HttpHandler<...>` сужает payload до `T`, выведенного из `InputSchema<T>` текущего validate-wrapper.

**Что меняется в `HttpHandler` / `WsHandler` сами по себе.** Типы из `types.d.ts:208-216` уже параметризованы `TPayload` (нейтральным generic-параметром), так что трогать их не нужно. Они работают с любым источником `T` — ArkType-выведенным сегодня, `Validator<T>`-выведенным после рефакторинга. Единственное, что меняется — внутренний `InferPayload<T>` (`types.d.ts:200`), который сейчас умеет только `BaseType<infer U>`. Его судьба обсуждается в §5.6.

#### 5.2.2. Почему нет `isArkType`-guard'а и throw-ветки

Тип параметра `validator` объявлен как `InputSchema<unknown> | undefined` — TypeScript уже не пропустит ничего другого. Никаких runtime-проверок на «вдруг там не схема» не требуется: компилятор это уже отверг.

Если кто-то принудительно приведёт через `as`, это намеренный обход типов, а не «опечатка», и runtime-throw здесь не помог бы.

#### 5.2.3. `defineWsRoute` — то же самое

Идентичная схема: `DefineWsRouteInput<TSchema>` строится через `Omit<RouteConfig, "validator">` (т.к. WS-маршруты используют тот же `RouteConfig` — см. `types.d.ts:223`), `handler: WsHandler<InferSchema<TSchema>>` (с тем же bivariance-хаком, `types.d.ts:214-216`). Контроллерные методы WS прокидываются через `.bind(...)` так же, как HTTP.

```ts
type DefineWsRouteInput<TSchema extends InputSchema<unknown> | undefined> =
  Omit<RouteConfig, "validator"> & {
    validator?: TSchema;
    handler: WsHandler<InferSchema<TSchema>>;
  };
```

#### 5.2.4. Использование в маршрутах

Маршруты **не меняются** — синтаксис тот же, что и сейчас:

```ts
// src/app/routes/http-routes.ts
import { LoginInputSchema, RegisterInputSchema } from "shared/schemas";

defineRoute({
  url: "/login",
  method: "post",
  validator: LoginInputSchema,         // <- schema current engine wrapper understands
  handler: AuthController.login.bind(AuthController),
}),

defineRoute({
  url: "/register",
  method: "post",
  validator: RegisterInputSchema,
  handler: AuthController.register.bind(AuthController),
}),
```

Это сильное преимущество выбранной конвенции: ~80 существующих маршрутов **не требуют правок** на этапе миграции — все изменения локализованы в `define-route.ts` / `define-ws-route.ts`.

### 5.3. `server.ts:263-279` ⇒

```ts
if (route.validator !== undefined && result.payload !== null) {
  const out = route.validator.validate(result.payload);
  if (!out.ok) throw new ValidationError(out.messages);
  return { payload: out.value as Payload, files: result.files };
}
return { payload: null, files: result.files };
```

Удаляются: `import { type } from "@arktype/type"`, проверка `instanceof type.errors`.

### 5.4. `ws-api-dispatcher.ts:72-91` ⇒ та же замена.

### 5.5. `serialize-routes.ts`

```ts
// читает describe(), а не объект validator напрямую
const native = (obj.validator as { describe?: () => unknown } | undefined)?.describe?.();
if (isArkType(native)) {
  result.inputSchema = serializeArkSchema(native);
}
```

Этот файл остаётся единственным местом в `vendor/`, где живёт `isArkType` — потому что doc-формат ArkType-specific. Если в будущем добавим Zod-адаптер, он принесёт свою функцию сериализации в `app/validate/adapters/`, а `serialize-routes.ts` переедет на стратегию по типу `describe()`.

### 5.6. `types/types.d.ts`

- **Удалить поля `validator`** из `HttpContext`, `WsContext`, `HttpData` (см. §3.4).
- **`RouteItem<TValidator>`** (`types.d.ts:239-245`) сейчас параметризован `TValidator extends BaseType`. Меняем на `TValidator extends Validator<unknown>`:
  ```ts
  export interface RouteItem<
    TValidator extends Validator<unknown> | undefined = Validator<unknown> | undefined,
  > extends RouteConfig<TValidator> {
    handler: TValidator extends Validator<unknown>
      ? RouteHandler<InferPayload<TValidator>>
      : RouteHandler;
  }
  ```
  `RouteHandler<TPayload>` (с bivariance-хаком, `types.d.ts:208-210`) **не трогаем** — он уже параметризован `TPayload` и работает с любым источником.
- **`RouteConfig<TValidator>`** (`types.d.ts:223-236`) — то же самое: `TValidator extends Validator<unknown> | undefined`.
- **`InferPayload<T>`** (`types.d.ts:200`) сейчас умеет только `BaseType<infer U>`. Заменить определением из `vendor/contracts/validator.ts` (см. §3.1): `T extends Validator<infer U> ? U : unknown`. Удалить старую версию из `types.d.ts`. Все её внутренние потребители (`RouteItem`, `RouteHandler<InferPayload<...>>`) автоматически переключатся на новую семантику.
- **`import type { BaseType } from "@arktype/type"` в `types.d.ts` остаётся**, но используется только в типе `ResponseSchema?: BaseType` внутри `RouteConfig`. Это явная оговорка из §2: `ResponseSchema` — отдельный рефакторинг. Если мы хотим в этом же PR полностью развязать `vendor/types` от ArkType, придётся либо:
  - вынести `RouteConfig`/`ResponseSchema` в `app/routing/types.ts` (естественно — он уже потребляется только из `app/routing/define-route.ts`); либо
  - временно объявить `ResponseSchema?: unknown` и обработать её сужение в doc-генераторе.

  Конкретное решение по `ResponseSchema` — за рамками этого документа, но автор реализации должен сознательно выбрать одно из двух, не оставляя противоречия.

---

## 6. План миграции (один PR)

Все шаги — в одном коммите/PR, чтобы избежать промежуточных состояний с двумя API параллельно.

1. **Контракт.** Создать `src/vendor/contracts/validator.ts` (см. §3.1).
2. **Адаптер.** Создать `src/app/validate/adapters/arktype-adapter.ts` + публичный `src/app/validate/index.ts` с экспортом `defaultValidator` и `InputSchema` (см. §3.2 и §3.6).
3. **Переезд routing.** Перенести `define-route.ts` и `define-ws-route.ts` из `src/vendor/utils/routing/` в `src/app/routing/`. Обновить импорты в `src/app/routes/http-routes.ts`, `ws-routes.ts` (других потребителей нет — проверить grep'ом).
4. **Новые `defineRoute` / `defineWsRoute`.** Сигнатура из §5.2.1: дженерик `<TSchema extends InputSchema<unknown> | undefined>`, внутри функции вызов `defaultValidator(config.validator)` с подстановкой `Validator<T>` в `RouteItem`. **Маршруты в `http-routes.ts` / `ws-routes.ts` не правятся** — синтаксис `validator: SomeSchema` остаётся прежним.
5. **Удалить write-only `validator` из `HttpContext`, `WsContext`, `HttpData`.** `server.ts:480`, `ws-api-dispatcher.ts`, `http-context.ts:30` больше не пробрасывают это поле. `WsData.validator` не существует — менять там ничего не нужно.
6. **`server.ts` и `ws-api-dispatcher.ts`** — переключить на `Validator.validate()`. Удалить `import { type } from "@arktype/type"` из этих двух файлов.
7. **`serialize-routes.ts`** — переключить на `validator.describe?.()`.
8. **`types/types.d.ts`** — поле `validator` в `RouteItem`/`RouteConfig` через `Validator<unknown>`, удалить из контекстов и `HttpData`. `import type { BaseType }` остаётся (используется в `ResponseSchema`, см. §5.6).
9. **Финальный grep:** `@arktype/type` не должен встречаться в `src/vendor/start/server.ts`, `src/vendor/utils/routing/ws-api-dispatcher.ts`, `src/vendor/utils/routing/define-*-route.ts` (последние перенесены в `app/routing/`). В `src/vendor/types/types.d.ts` импорт остаётся ровно для `ResponseSchema`. В `src/vendor/utils/tooling/serialize-ark-schema.ts` — остаётся by design.
10. **README.** Добавить в `packages/backend/README.md` (рядом с разделом «Validation (ArkType)») короткую запись про конвенцию из §3.6: проект использует один валидатор — ArkType; маршруты передают сырую схему `validator: SomeSchema`, обёртку делает `defineRoute` сам; смешивать движки не следует. Этот шаг — обязательная часть PR.

Typecheck должен оставаться зелёным после шагов 1-2 (только дополнения), и снова зелёным после шага 9. Промежуточные шаги в одном PR — не проблема, главное — не мерджить разорванное состояние.

---

## 7. Тесты

Не ограничиваемся typecheck — добавляем поведенческие тесты в этом же PR:

| Тест | Что проверяем |
|---|---|
| `arktype-adapter.spec.ts` (unit) | `arkValidator(schema).validate(...)` возвращает `{ ok: true, value }` для валидного ввода и `{ ok: false, messages: [...] }` для невалидного. `describe()` возвращает исходную схему. |
| `http-validation.spec.ts` (integration) | POST с валидным body → 200 + `httpData.payload` типизирован. POST с невалидным body → 422 `ValidationError` (поведение после рефакторинга идентично прежнему). |
| `ws-validation.spec.ts` (integration) | WS-сообщение с невалидным payload → ответ-ошибка от диспетчера, handler не вызывается. |
| `serialize-routes.spec.ts` | Нормализованный маршрут после `defineRoute({ validator: schema, ... })` сериализуется с непустым `inputSchema` (через `describe()`). Маршрут без validator → без `inputSchema`. |

Если в проекте ещё нет integration-харнесса для server.ts — для http/ws тестов достаточно unit-уровня: вызывать `readAndParseBody`/dispatcher как функции и проверять контракты.

---

## 8. Что в scope, а что нет

**Архитектурный рефакторинг (в scope):**
- runtime input-validation для HTTP и WS — переход на `Validator<T>`;
- удаление `@arktype/type` из `vendor/start/server.ts`, `ws-api-dispatcher.ts`, `define-*-route.ts` (после переезда в `app/routing/`);
- удаление write-only `validator` из `HttpContext`, `WsContext`, `HttpData` (см. §3.4);
- сужение `BaseType`-импорта в `vendor/types/types.d.ts` до единственного места — поля `ResponseSchema`.

**Минимальная адаптация без архитектурного рефакторинга (в scope, но как точечная правка):**
- `serialize-routes.ts` — переключить чтение `obj.validator` на `obj.validator?.describe?.()`. Doc-формат, `isArkType`-guard и `serialize-ark-schema.ts` остаются прежними, ArkType-specific by design.

**Не в scope (отдельные задачи, если возникнет необходимость):**
- `ResponseSchema` — остаётся `BaseType`, используется только для doc-генерации, не на горячем пути. Полное удаление `BaseType` из `vendor/types/` потребует переезда `RouteConfig`/`ResponseSchema` в `app/routing/types.ts` (см. §5.6) — отдельный PR.
- Архитектурный рефакторинг doc tooling (`serialize-routes.ts`, `serialize-ark-schema.ts`) под мульти-движковую сериализацию — пока единственный формат для doc-страницы ArkType, и второго движка в проекте нет (см. §3.6). Если когда-то добавится Zod, появится своя сериализация в `app/validate/adapters/zod/`.
- Асинхронные валидаторы — текущий ArkType синхронный, бизнес-проверки (`unique-email` и т.п.) живут в сервисах, а не в схеме формы.

**Что это даёт.** В проекте сознательно используется **один движок схем — ArkType** (см. §3.6). Абстракция `Validator<T>` нужна не для гибридного использования нескольких движков по маршрутам, а для:

- развязки `vendor/` от конкретной библиотеки (упрощает понимание ядра, рефакторинг, тестирование);
- тривиального мокирования в тестах;
- возможности **глобально** заменить движок одним PR, если это понадобится (новый адаптер → переписывание всех схем → удаление старого адаптера).

Сериализация для doc-страницы остаётся отдельным каналом через `Validator.describe?()` и при смене движка потребует свой serializer — это не «one adapter file», но и не размазанная по `vendor/` зависимость, как сейчас.

---

## 9. Открытые вопросы

- Имя нейтрального слоя: `vendor/contracts/` vs `src/contracts/`? — предпочитаю первое, чтобы не плодить top-level директории; контракты концептуально часть фреймворка.
- Стоит ли сразу описать минимальный `nativeValidator(predicate)` рядом с `arkValidator`, чтобы доказать, что абстракция работает без ArkType? — да, это ~20 строк, и доказательство универсальности контракта.
- Делать ли `describe()` обязательным? — нет, опциональный. Адаптеры без structural-introspection (например, на функциях) просто не реализуют его, и в doc они не попадут.
