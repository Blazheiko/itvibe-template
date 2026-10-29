# Task list: runtime-валідація відповідей за `ResponseSchema`

> Джерело: [response-schema-runtime-validation.md](./response-schema-runtime-validation.md).
> Посилання `§N` ведуть на розділи плану. Кожна задача — окремий коміт; гейт після кожної:
> `pnpm --filter backend typecheck && pnpm --filter backend lint && pnpm --filter backend test`.
>
> **Політика гейтів до T8.** Дефолт для не-production — `strict`, тож після T6/T7 наявні тести
> можуть падати через старі розбіжності схем, виправлення яких заплановане в T8. Щоб гейти
> T6/T7 були чесно зеленими, T6 тимчасово фіксує `RESPONSE_VALIDATION=log` у
> `packages/backend/vitest.config.ts` (`test.env`) і в env backend для e2e. Нові тести
> T4/T6/T7 задають режим явно і від цього не залежать. T8 прибирає фіксацію, тож тести
> знову працюють у дефолтному `strict`. Розбіжності, знайдені до T8, у T6/T7 не виправляються,
> а записуються в `progress.md`.

## Граф залежностей

```
T0 → T1 → T2
     T1 → T4 ─┐
     T3 ──────┼→ T5 → T6 ─┐
              │      T5 → T7 ─┼→ T8 → T9 → T10 → T11 → T12 → T13 (розкатка, після merge)
```

T3 не залежить від T1/T2. T6 і T7 можна робити паралельно. T8 потребує T6 і T7: без
рантайм-перевірки розбіжності не видно.

---

## T0. Реєстрація фічі

- [ ] Додати в `feature_list.json` запис `feat-0XX: runtime response validation`
      (`owner`, `branch`, `status: in_progress`, `dependencies: []`) — PR у `main`.
- [ ] Створити гілку `feat/response-validation`, `progress.md` і `session-handoff.md` на ній.
- [ ] `./init.sh` проходить.

**Done:** PR з записом злитий, гілка існує.

## T1. Конфіг `RESPONSE_VALIDATION` (§4.1)

- [ ] `packages/backend/src/config/response-validation.ts` за зразком `config/logging.ts`:
      `RESPONSE_VALIDATION_MODES`, `mode`, `sampleRate`, `configError`, `Object.freeze`.
- [ ] Дефолт: `strict`, якщо не `isProductionLike`; інакше `off`.
- [ ] `RESPONSE_VALIDATION_SAMPLE_RATE`: число `0..1`, дефолт `1`; інше → `configError`.
- [ ] Невалідний режим → `configError` (без тихого fallback).
- [ ] `config/response-validation.spec.ts`: кожен режим, регістр/пробіли, дефолти для
      dev/prod, невалідні значення режиму й rate.

**Done:** тести зелені.

## T2. Перевірка конфігу на старті + `.env.example`

- [ ] Підключити `configError` у `validateRuntimeConfig()` — старт зупиняється з
      повідомленням.
- [ ] `packages/backend/.env.example`: `RESPONSE_VALIDATION`, `RESPONSE_VALIDATION_SAMPLE_RATE`
      з коментарем (режими, дефолти, рекомендації за середовищем, §3.4).
- [ ] Тест: невалідне значення → `validateRuntimeConfig()` повертає/кидає помилку.

**Done:** тести зелені.

## T3. `hasResponseBody()` зі `sendResponse` (§4.3.1)

Чистий рефакторинг без зміни поведінки.

- [ ] Винести з `server.ts:286` функцію `hasResponseBody(status, payload)`: `false` для 3xx
      (включно з 304), 204, 205, 2xx з `null`/`undefined` payload.
- [ ] `sendResponse` використовує її; перетворення 200 → 204 залишається на місці.
- [ ] Unit-тести на таблицю статусів; наявні `http-empty-payload.spec.ts`,
      `http-cache-control.spec.ts` зелені без змін.

**Done:** поведінка відправлення не змінилась, тести зелені.

## T4. Модуль `validate-response.ts` (§4.2, §4.5)

- [ ] `packages/backend/src/vendor/utils/validation/validate-response.ts`:
      `createResponseCheck(schema, config) → ResponseCheck | null`.
- [ ] `null`, якщо `mode === 'off'` або схеми немає.
- [ ] Перевірка: `schema(payload) instanceof type.errors`; результат схеми **не** підміняє
      payload.
- [ ] Sampling тільки в `log`; `strict` перевіряє кожну відповідь.
- [ ] Лог `warn` (`log`) / `error` (`strict`): `{ route, requestId, mode, issues }`, де
      `issues` — `path`, `expected`, `code`, **без** `actual`.
- [ ] Дедуплікація: ≤ 1 лог на маршрут за N секунд + лічильник пропущених.
- [ ] Sentry `captureMessage` з тегом `response_validation`, якщо Sentry увімкнено
      (через ту саму дедуплікацію).
- [ ] Unit-тести:
    - [ ] valid / invalid / `off` → `null` / немає схеми → `null`;
    - [ ] лог не містить значень з payload (перевірити на полі з «секретом»);
    - [ ] дедуплікація й лічильник;
    - [ ] `log` + rate `0` → схема не викликається; `log` + rate `1` → завжди;
          `strict` + rate `0` → завжди;
    - [ ] payload не мутується (схема з морфом);
    - [ ] Sentry увімкнено: `captureMessage` викликано з тегом `response_validation` і
          полями `route`/`mode`, без значень з payload;
    - [ ] Sentry: повторні помилки того самого маршруту в межах вікна дедуплікації → одна
          подія (спільна дедуплікація з логом);
    - [ ] Sentry вимкнено → `captureMessage` не викликається, лог пишеться.

**Done:** тести зелені.

## T5. `NormalizedRouteItem` + побудова в `router.ts` (§4.2)

- [ ] `types.d.ts`: `NormalizedRouteItem extends RouteItem` з обов'язковим
      `responseCheck: ResponseCheck | null`.
- [ ] `router.ts`: завжди записувати функцію або явний `null`.
- [ ] Перевести `server.ts` і `ws-api-dispatcher.ts` на `NormalizedRouteItem`.
- [ ] Тест: для кожного маршруту з `http-routes.ts` і `ws-routes.ts` після нормалізації
      `responseCheck !== undefined`.

**Done:** typecheck чистий, тести зелені.

## T6. HTTP-інтеграція (§4.3.1)

- [ ] У `server.ts` після `route.handler` і до `sendResponse`: перевірка, якщо хендлер
      виконався, `responseCheck !== null` і `hasResponseBody()`.
- [ ] Не перевіряти, якщо middleware зупинив ланцюжок або хендлер кинув виняток.
- [ ] `strict` + невалідно: `status = 500`, канонічний `internal_error`, очистити
      `responseData.headers`, **не** чіпати `responseData.cookies`.
- [ ] Тимчасово зафіксувати `RESPONSE_VALIDATION=log` для наявних тестів і e2e (див.
      «Політика гейтів до T8»).
- [ ] Інтеграційні тести (стиль `http-validation.spec.ts`):
    - [ ] невалідний payload: `strict` → 500; `log` → оригінальна відповідь + warn;
          `off` → схема не викликається;
    - [ ] `/ready` з валідним `503 { status: 'unavailable' }` → перевірено, пройшло, 503;
    - [ ] middleware зупинив запит (401, 429) → схема не викликається;
    - [ ] 3xx (OAuth-редирект), 204, 205, порожній 200 → схема не викликається, поточна
          поведінка відправлення зберігається (включно з 200 → 204);
    - [ ] хендлер кинув виняток → звичайний `handleError`, схема не викликається;
    - [ ] strict-500 не містить `ETag`/`Content-Disposition` хендлера, але містить
          `set-cookie` сесії;
    - [ ] тіло strict-500 не містить деталей валідації.

**Done:** тести зелені.

## T7. WS-інтеграція (§4.3.2)

- [ ] У `ws-api-dispatcher.ts` після `responseData.data = await handler(context)`.
- [ ] `strict` + невалідно: `data = null`, `status = 'error'`,
      `error = createWsErrorEnvelope('internal_error', 'Internal server error')`.
- [ ] Наявні гілки rate-limit / validation_failed / not_found не змінювати.
- [ ] Тести в `ws-validation.spec.ts`:
    - [ ] `strict` → `status: 'error'`, `error.code: 'internal_error'`, `data: null`,
          без деталей валідації;
    - [ ] `log` → оригінальний envelope без змін + warn;
    - [ ] `off` → схема не викликається;
    - [ ] валідна відповідь → без змін.

**Done:** тести зелені.

## T8. Виправлення розбіжностей схем (§5 крок 8)

Після T6 і T7.

- [ ] Зібрати список невалідних маршрутів із warn-логів прогонів у режимі `log` (T6/T7 +
      `progress.md`).
- [ ] Виправити розбіжності (нижче), потім прибрати тимчасову фіксацію `log` з
      `vitest.config.ts` та e2e env.
- [ ] Прогнати `pnpm test` і `pnpm --filter frontend test:e2e` у дефолтному `strict`.
- [ ] Виправити кожну розбіжність окремим комітом (схема в `shared/responses` або
      контролер/трансформер — що з них хибне, вирішувати в кожному випадку).
- [ ] Якщо розбіжностей > ~10 — винести в окрему фічу і зафіксувати в `progress.md`.

**Done:** фіксацію `log` прибрано; повний прогін у `strict` без помилок валідації відповіді.

## T9. Бенчмарк (§3.3)

- [ ] Заміряти великий list-маршрут (`admin-user` list) та типовий маленький у `off` /
      `log` / `strict`.
- [ ] Записати результати в `progress.md` і оновити §3.3 плану реальними цифрами.
- [ ] Якщо накладні витрати суттєві — оновити рекомендації §3.4 (дефолтний sample rate для
      production).

**Done:** цифри зафіксовані.

## T10. Документація (§5 крок 10)

- [ ] `documentation/backend/response-validation.md`: режими, env, політика статусів,
      WS-відмова, межі гарантій (об'єкт до серіалізації, без захисту від зайвих полів,
      без асинхронних WS-повідомлень), рекомендації за середовищем.
- [ ] Посилання на код на GitHub; додати сторінку в сайдбар
      `documentation/.vitepress/config.ts` і в `KEY_PAGES`
      (`documentation/scripts/verify-dist.mjs`).
- [ ] Згадати змінні на сторінці env, якщо вона є.
- [ ] `pnpm docs:build && pnpm docs:verify`.

**Done:** docs збираються й проходять перевірку.

## T11. Definition of Done

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter frontend test:e2e` — чисто.
- [ ] Ручна перевірка: запуск із кожним режимом, навмисно зламана відповідь на тестовому
      маршруті → 500 / warn / нічого.
- [ ] Evidence of Completion у `progress.md`.
- [ ] PR фічі з описом і переліком перевірок.

## T12. Закриття

- [ ] PR у `main`, що переводить фічу в `feature_list.json` на `done` з посиланням на evidence.
- [ ] Завести follow-up фічі (§7 плану):
    - [ ] вирізання зайвих полів через `'+': 'delete'` (§4.4);
    - [ ] узгодження схем із JSON-форматом (`Date` → ISO-рядок);
    - [ ] уніфікація `data` у WS-помилках (`{}` → `null`);
    - [ ] валідація асинхронних WS-повідомлень і broadcast;
    - [ ] per-route override (якщо підтвердиться потреба).
- [ ] Завести в `feature_list.json` операційну фічу розкатки
      `feat-0YY` (response validation rollout, залежить від цієї фічі) — далі T13
      ведеться в ній.

## T13. Розкатка за середовищами (§6 плану)

Операційна робота після merge, відстежується окремою фічею `feat-0YY` у `feature_list.json`
з власними `progress.md` / evidence. **Відповідальний:** `owner` цієї фічі (за замовчуванням
той самий, що й у фічі реалізації).

- [ ] **Staging → `log`:** виставити `RESPONSE_VALIDATION=log`, `RESPONSE_VALIDATION_SAMPLE_RATE=1`.
      Evidence: дата ввімкнення, конфіг деплою.
- [ ] **Production → `log`:** sample rate за результатами бенчмарку T9.
      Evidence: дата, значення rate, метрики латентності до/після.
- [ ] **Спостереження:** збирати warn-логи та Sentry-події з тегом `response_validation`;
      кожну розбіжність виправляти окремим PR. Evidence: список знайдених розбіжностей і PR.
- [ ] **Критерій готовності до `strict`:** N днів (рекомендовано 14) без жодного warn у
      staging і production при rate `1` хоча б у staging.
- [ ] **Staging → `strict`** після виконання критерію. Evidence: дата, відсутність 500 з
      `internal_error` через валідацію за наступний тиждень.
- [ ] **Production → `strict`** — тільки за окремим рішенням команди, зафіксованим у
      `progress.md` фічі розкатки (або свідоме рішення залишити `log`).

**Done:** staging у `strict`, production у погодженому режимі; рішення й evidence записані;
`feat-0YY` → `done`.
