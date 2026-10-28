# ADR 0001: абстракція валідатора в ядрі фреймворку

- **Статус:** прийнято, реалізовано.
- **Дата запису:** 2026-10-24 (feat-009). Рішення реалізоване до початку git-історії (знімок `8f3479f`, 2026-06-01).
- **Джерело:** початковий план [`VALIDATOR_ABSTRACTION_PLAN.md`](https://github.com/Blazheiko/vibe-template/blob/8f3479f/packages/backend/src/docs/VALIDATOR_ABSTRACTION_PLAN.md) (файл видалено у feat-009; посилання на останній коміт, де він змінювався).

## Контекст

ArkType (`@arktype/type`) протікав у ядро фреймворку `packages/backend/src/vendor/`: `server.ts` і `ws-api-dispatcher.ts` викликали схему напряму й перевіряли `instanceof type.errors`, а `BaseType` був зашитий у `HttpContext`, `WsContext`, `HttpData` і `RouteConfig`. Ядро не можна було використати чи протестувати без конкретної бібліотеки валідації.

## Рішення

1. **Контракт у ядрі.** `vendor/contracts/validator.ts` задає `Validator<T>` з `validate(input) → { ok: true, value } | { ok: false, messages }` і необов'язковим `describe()` для документації. Шлях валідації запитів у `vendor/` (HTTP у `server.ts`, WS у `ws-api-dispatcher.ts`) працює лише з цим інтерфейсом; свідомі винятки — у п. 5.
2. **Адаптер у застосунку.** `app/validate/adapters/arktype-adapter.ts` реалізує `Validator<T>` для ArkType; `app/validate/index.ts` експортує його як `defaultValidator`.
3. **Обгортання в `defineRoute` / `defineWsRoute`** (`app/routing/`). Маршрути передають сиру схему (`validator: SomeSchema`), обгортку робить `defineRoute`. `RouteItem.validator` — `Validator<unknown>`.
4. **Один валідатор на проєкт.** Змішувати движки по маршрутах не можна: заміна бібліотеки — глобальна (новий адаптер і зміна `defaultValidator`).
5. **Свідомо прив'язане до ArkType** (поза рішенням): `ResponseSchema` (`BaseType` у `vendor/types/types.d.ts`), типи `defineRoute` / `defineWsRoute` / `InferQuery` (type-only імпорт `Type`), doc-серіалізація (`serialize-routes.ts` бере `validator.describe?.()` і приймає лише ArkType; перетворення — `serialize-ark-schema.ts`), схема WS-конверта в `ws-message-validator.ts`.

## Наслідки

- `server.ts` і `ws-api-dispatcher.ts` не імпортують `@arktype/type`; помилка валідації — `ValidationError` → 422 незалежно від бібліотеки.
- Заміна ArkType можлива, але не дешева: окрім адаптера, треба переписати схеми в `shared`, типи `defineRoute` / `InferQuery`, `ws-message-validator.ts` і doc-серіалізацію.
- Пізніші модулі будуються на контракті: `vendor/utils/validation/` (`validate-route-payload.ts`, `flatten-query.ts`, `get-typed-payload.ts`), `vendor/utils/routing/body-methods.ts`.

## Не реалізовано з плану

Рішення «не робимо» прийнято 2026-10-24 у feat-026 (п. 27 code-issues):

- **Експорт `InputSchema` з `app/validate/index.ts` (§3.6 плану).** Схеми входу живуть у `packages/shared` і імпортуються з `shared/schemas` і бекендом, і фронтендом. Ще одна точка реекспорту в бекенді дала б два шляхи до тих самих схем без нової можливості.
- **Демонстраційний `nativeValidator(predicate)` (§9).** Другий адаптер без жодного споживача — мертвий код. Контракт `Validator<T>` і без нього перевіряється тестами `arkValidator` і використовується ядром (`validate-route-payload.ts`, `ws-api-dispatcher.ts`); приклад власного адаптера описано в [`validation.md`](https://github.com/Blazheiko/vibe-template/blob/main/documentation/backend/validation.md#заміна-бібліотеки-валідації).
- **Перенесення `RouteConfig` / `ResponseSchema` з `vendor/types` в `app/routing/types.ts` (§5.6).** `vendor/types` — публічна поверхня типів ядра, її імпортують `vendor/start/*` і `vendor/utils/*`. Перенесення в `app/` змусило б `vendor` залежати від `app`, тобто порушило б напрям залежностей із розділу «Розподіл vendor/ та app/» в `architecture.md`.
- Нотатка про конвенцію «один валідатор» у README (крок 10) — тепер вона в [`documentation/backend/validation.md`](https://github.com/Blazheiko/vibe-template/blob/main/documentation/backend/validation.md#заміна-бібліотеки-валідації) і в п. 4 цього ADR.

Поточний опис валідації — [Валідація](https://blazheiko.github.io/vibe-template/backend/validation).
