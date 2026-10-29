# feat-050: тип відповіді хендлера виводиться з `ResponseSchema`

> Статус: план (не реалізовано). Дата: 2026-10-29. Залежить від feat-044.

## 1. Задача

Зараз `ResponseSchema` маршруту і TypeScript-тип результату контролера не пов'язані:
`defineRoute` / `defineWsRoute` приймають хендлер із загальним типом результату
`HandlerReturn = Promise<Payload> | Payload` (`packages/backend/src/vendor/types/types.d.ts:212`).
Відповідність стежить лише розробник через ручну анотацію `ping(): PingResponse`.
feat-044 ловить розбіжність під час виконання, але тільки на викликаних маршрутах і не для
відповідей без тіла (3xx, 204, 205).

Мета: якщо маршрут оголошує `ResponseSchema`, TypeScript перевіряє, що хендлер повертає
**вхідний** тип схеми `Schema['inferIn']` (або `Promise` від нього) — те, що feat-044 подає
у `schema(payload)` (§4.1). Без `ResponseSchema` поведінка не змінюється.

## 2. Що показав прототип

Прототип (тимчасова зміна `define-route.ts`, `tsc --noEmit` на 60 HTTP-маршрутах, потім
відкат) дав 4 помилки:

| Місце                                                           | Що не так                                                                                                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/push-subscriptions/test-push` (`http-routes.ts:290`) | Контролер `testPush` анотовано власним типом `{ status: string; ... }`, а схема `TestPushResponseSchema` — `status: 'success'`. Тип контролера ширший за контракт               |
| `GET /api/support/screenshot/:articleId` (`http-routes.ts:418`) | Маршрут оголошує **чужу** схему `SupportKnowledgeBaseItemResponseSchema`, а контролер повертає `302` з `{ status: 'redirect' }`. feat-044 цього не бачить: 3xx не перевіряється |
| `serialize-routes.spec.ts:99`, `:131`                           | Тестові фікстури повертають `{ ok: true }` при іншій схемі                                                                                                                      |

Підстановка чужої схеми (`/ping` з `ReadyResponseSchema`) дає помилку `tsc` одразу.

## 3. Аналіз впливу

### 3.1 Developer experience — позитивний

- Розбіжність «маршрут ↔ контролер» видно в IDE до запуску, на всіх маршрутах, а не лише
  на викликаних у тестах.
- Схема в маршруті стає контрактом, з яким TypeScript звіряє **уже виведений** тип
  результату контролера. Контекст типізації назад у метод контролера не передається:
  контролер оголошено окремо, тож без анотації `return { status: 'success' }` виводиться як
  `{ status: string }` і перевірку не пройде. Тому анотацію `XxxResponse` (або `as const`)
  на практиці лишаємо (§6); фіча гарантує сумісність, а не відмову від анотацій. Інлайн-хендлер
  прямо в `defineRoute` отримує контекстний тип і анотації не потребує.
- Ловить випадки, які feat-044 не бачить за дизайном: відповіді без тіла й маршрути, які
  не викликались.

### 3.2 Мінуси

- Помилки TypeScript довгі: розгортається весь union разом із
  `CanonicalErrorResponseSchema` (13 кодів). Пом'якшення — §4.3, але це очікування, а не
  гарантія: який вигляд матиме діагностика, покаже лише перевірка на реальному прикладі.
- Хендлери, які повертають `null` (204) або роблять редирект, потребують схеми, що це
  описує, або явного рішення (§4.4).
- Час `tsc` для бекенда зараз ~2 с; вплив генерика не заміряно (крок T6).

### 3.3 Чого не дає

- Зайві поля TypeScript дозволяє (структурна типізація) — це feat-046.
- `Date` проти ISO-рядка — схема описує об'єкт до серіалізації, як і feat-044; це feat-047.
- Безпеки під час виконання не додає: це лише перевірка типів.

## 4. Дизайн

### 4.1 Тип хендлера

У `define-route.ts` додати третій генерик `TRes extends Type | undefined = undefined`:

```ts
// [TRes] — без дистрибуції: `Type | undefined` не має розпадатися на `T | Payload`
type InferResponse<TRes> = [TRes] extends [Type] ? TRes['inferIn'] : Payload

type DefineRouteInput<TBody, TQuery, TRes> = Omit<RouteConfig, 'method' | 'validator' |
    'queryValidator' | 'ResponseSchema'> & ... & {
    ResponseSchema?: TRes
    handler: TypedHandler<HttpContext<InferSchema<TBody>, InferQueryFromSchema<TQuery>>,
        InferResponse<TRes>>
}
```

- `TypedHandler<TContext, TOut>` — той самий bivariance-трюк, що й `BivariantHandler`
  у `types.d.ts`, але з результатом `TOut | Promise<TOut>`.
- Без `ResponseSchema` результат лишається `Payload` — нинішня поведінка.
- Береться **вхідний** тип схеми (`inferIn`), а не вихідний (`infer`): feat-044 викликає
  `schema(payload)` з результатом контролера й відкидає результат перетворення
  (`validate-response.ts:105`). Отже результат контролера — це вхід схеми. Для схем без
  морфів (`.pipe`, `.to`) типи збігаються; у нинішніх `shared/responses` морфів немає, тож
  це закриває розбіжність статичного і runtime-контракту на майбутнє.
- Умовний тип не дистрибутивний (`[TRes] extends [Type]`). Інакше `ResponseSchema` типу
  `Type | undefined` (напр. з умовного виразу) дав би `T | Payload`, тобто фактично без
  перевірки. Тепер такий випадок дає `Payload` явно — і це фіксує тест (T1).
- Повернення з `defineRoute` лишається `RouteItem`: типізація потрібна лише на вході.

### 4.2 WebSocket

`define-ws-route.ts` — та сама зміна для `WsHandler`. WS-маршрутів 5, тож це в цій фічі.

### 4.3 Читабельність помилок

Іменований тип `RouteResponse<TRes>` замість inline-union — спроба отримати в першому рядку
`... is not assignable to RouteResponse<typeof XxxResponseSchema>`. TypeScript може
розгорнути аліас, тож це не гарантовано. У T2 перевірити реальне повідомлення; якщо аліас
не допомагає — прибрати його, а не ускладнювати типи. У документацію йде фактичний вигляд.

### 4.4 Відповіді без тіла

Не вводити обхід типів. Для маршрутів-редиректів (`/support/screenshot/:articleId`,
OAuth `redirect`/`callback`) схема має описувати те, що реально повертає контролер
(напр. `{ status: 'redirect' }` | `CanonicalErrorResponseSchema`). Хендлер, що повертає
`null`, — схема з `'null'` у union. Якщо таких випадків стане багато — окреме рішення.

## 5. Кроки

1. **T0** — запис feat-050 у `feature_list.json` + цей план (PR у `main`); гілка
   `feat/typed-route-response`.
2. **T1** — тести типів перед зміною (`define-route.spec.ts` уже використовує
   `@ts-expect-error`):
    - хендлер повертає тип, що не відповідає схемі → `@ts-expect-error`;
    - чужа схема для хендлера з анотацією → `@ts-expect-error`;
    - без `ResponseSchema` повертається будь-який `Payload` → компілюється;
    - `Promise` і синхронний результат → компілюються;
    - схема з union `CanonicalErrorResponseSchema` приймає помилку з `mapControllerError`;
    - `null`: схема без `'null'` → `@ts-expect-error`, схема з `'null'` → компілюється;
    - хендлер через `.bind(controller)` перевіряється так само, як стрілка;
    - одночасне виведення `body` / `query` / результату: типи контексту не ламаються від
      третього генерика;
    - схема з морфом: результат контролера звіряється з `inferIn`, а не з `infer`;
    - `ResponseSchema` типу `Type | undefined` — зафіксувати фактичну поведінку (`Payload`);
    - негативні WS-приклади (для T4): невідповідний результат, чужа схема.
3. **T2** — генерик у `defineRoute` (§4.1, §4.3).
4. **T3** — виправити знайдені розбіжності окремими комітами:
    - `testPush`: тип результату звузити до `TestPushResponse`;
    - `/support/screenshot/:articleId`: власна схема відповіді редиректу в
      `shared/responses/support-controller.ts` замість `SupportKnowledgeBaseItemResponseSchema`,
      **і** звузити тип `getScreenshot` (`support-controller.ts:54`) з широкого
      `Promise<{ status: string; message?: string }>` до типу цієї схеми — інакше перевірка
      знову впаде на `status: string`;
    - фікстури `serialize-routes.spec.ts`.
5. **T4** — `defineWsRoute` (§4.2) + тести типів; виправити, що знайдеться.
6. **T5** — пройти OAuth-маршрути та інші редиректи/`204` за §4.4.
7. **T6** — заміряти `pnpm --filter backend typecheck` до і після (медіана 3 прогонів),
   записати в `progress.md`.
8. **T7** — документація: `documentation/backend/routing.md` (поле `ResponseSchema`),
   `documentation/backend/adding-a-feature.md` і `documentation/guide/first-endpoint.md`
   (маршрут звіряє тип контролера зі схемою; анотацію контролера лишаємо — §3.1), реальне
   повідомлення про помилку з T2;
   `pnpm docs:build && pnpm docs:verify`. Оновити фразу «Тип відповіді контролера задається
   окремо типами з `shared`» у `routing.md`.
9. **T8** — Definition of Done: `pnpm typecheck`, `pnpm lint`, `pnpm test`,
   `CI=1 pnpm --filter frontend test:e2e`; мутаційна перевірка — повернути чужу схему в
   маршрут і переконатися, що `tsc` падає; evidence у `progress.md`; feat-050 → `done`.

## 6. Відкриті питання

- Чи прибирати ручні анотації `XxxResponse` з контролерів після T2? Пропозиція: ні,
  лишити — без них літерали розширюються (`'success'` → `string`, §3.1), а ще вони
  документують метод і потрібні тестам контролерів.
- Чи робити `ResponseSchema` обов'язковим для нових маршрутів? Пропозиція: окреме
  рішення після цієї фічі.
