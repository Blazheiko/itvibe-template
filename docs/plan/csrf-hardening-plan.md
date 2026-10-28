# План: посилення CSRF-захисту

Дата: 2026-10-27, ревізія 6 (після п'яти рев'ю). Базова гілка: `main` (після `267e152` HTML-оболонка вже не містить токена).

## Поточний стан

| Механізм                                                                                  | Де                                                                                 | Стан                                                        |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Synchronizer token у сесії Redis, заголовок `X-CSRF-Token`, `timingSafeEqual`             | `packages/backend/src/app/middlewares/csrf-guard.ts`                               | є                                                           |
| Токен видає API (`main/init`, auth-відповіді, 401/403 з ланцюга middleware)               | `main-service.ts:150`, `auth-service.ts:199`, `session-web.ts:19`                  | є                                                           |
| Фронт тримає токен у пам'яті, на `csrf_invalid` відновлює його через `init_app`           | `frontend/src/utils/csrf-token.ts`, `base-api.ts:84`                               | є                                                           |
| Анонімна сесія з токеном створюється **до** guard на кожен запит без валідної cookie      | `session-handler.ts:138`                                                           | є; тому `sessionInfo === null` у guard практично недосяжний |
| Перевірка `Origin` → `Referer`                                                            | `csrf-guard.ts:20`                                                                 | є, але з порожнім allowlist пропускає будь-який origin      |
| `CSRF_ENFORCE` / `CSRF_STRICT_ORIGIN`                                                     | `config/csrf.ts`                                                                   | **за замовчуванням `false`**                                |
| `auth.login` ротує session ID і токен (email/пароль, OAuth, телефон)                      | `session-handler.ts:184`                                                           | є                                                           |
| Ротація при `logout`, `logout-all`, `change-password`; password reset інвалідує всі сесії | `session-handler.ts`, `auth-service.ts:1184,1208`, `password-reset-service.ts:633` | є                                                           |
| API-відповіді мають `Cache-Control: no-store`                                             | `http-response-handlers.ts:113`                                                    | є                                                           |
| SW: гілка статики (`includes`-матчинг) стоїть **до** перевірки методу й API               | `frontend/src/service-worker.ts:279`                                               | **ризик**                                                   |

## Рішення щодо дизайну

- Схему не міняємо: synchronizer token у сесії + заголовок. Double-submit cookie не вводимо.
- Сесійна cookie лишається `SameSite=Lax`.
- **Підтримувана топологія:** фронт і API або same-origin, або на піддоменах одного сайту (same-site). Cross-site розгортання (різні реєстровані домени) **не підтримується**: з `Lax` браузер не надсилає сесійну cookie в cross-site `fetch` навіть з `credentials: 'include'` ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value)). Його підтримка — окрема задача (`SameSite=None` + партиціювання), поза цим планом. Обмеження фіксуємо в документації.
- Перевірки в `csrfGuard` для небезпечних методів — **послідовні фільтри**, кожен лише відхиляє і ніколи не дозволяє обійти наступні:
    1. Fetch Metadata (`Sec-Fetch-Site`);
    2. Origin/Referer;
    3. токен (сесія після `session_web` є завжди; гілку `sessionInfo === null` прибираємо або залишаємо як fail-closed 403).
- Нові значення `reason` у 403: `fetch_site_cross_site`, `fetch_site_invalid`. Поряд з `origin_mismatch` і `token_mismatch`. У shared-схемі (`packages/shared/src/responses/error-response.ts:14`) `reason` типізований як `string`, тож змін схеми не потрібно. Значення зібрати в одну константу (`CSRF_REJECT_REASONS`), щоб бекенд і фронт (п. 5a) посилалися на ті самі рядки.

---

## 1. `CSRF_ENFORCE=true` за замовчуванням

**Файли:** `packages/backend/src/config/csrf.ts`, `.env.example`, `app/start/validate-runtime-config.ts`.

- `enforce: parseBoolean(env['CSRF_ENFORCE'], true)`; `.env.example`: `CSRF_ENFORCE=true`.
- Новий дефолт **не перекриває** явно встановлене `CSRF_ENFORCE=false` в існуючих середовищах. Тому:
    - у `validateRuntimeConfig()` додати warning (поряд з `getProxyWarning`), якщо `appConfig.isProductionLike && !csrfConfig.enforce`;
    - у чеклисті релізу явно перевірити фактичні env усіх середовищ (див. «Rollout»).

## 2. Обов'язковий `CSRF_ALLOWED_ORIGINS` у production-like середовищах

**Файли:** `config/csrf.ts`, `app/start/validate-runtime-config.ts:28`.

- Production визначаємо **лише** через `appConfig.isProductionLike` (`config/app.ts:46`), а не через `app.env === 'production'`. `isProductionLike` враховує `APP_ENV`/`NODE_ENV` зі значеннями `production`/`prod` і `APP_IS_PRODUCTION`.
- `config/csrf.ts` за зразком інших конфігів отримує поле `configError: string | null`:
    - кожен елемент має бути точним origin: `new URL(x).origin === x`, схема `http(s)`, без шляху і кінцевого слеша → інакше `configError` у будь-якому середовищі;
    - `isProductionLike && allowedOrigins.length === 0` → `configError`.
- `validateRuntimeConfig()`: `if (csrfConfig.configError !== null) throw new Error(\`Invalid CSRF configuration: ...\`)`.
- Не-production з порожнім списком: warning у `validateRuntimeConfig()`. Поведінка guard з порожнім списком у dev — див. п. 3.
- Логіку валідації винести в чисту функцію `buildCsrfConfig(env, isProductionLike)` для юніт-тестів.

## 3. `CSRF_STRICT_ORIGIN=true` за замовчуванням

**Файли:** `config/csrf.ts`, `.env.example`.

- `strictOrigin: parseBoolean(env['CSRF_STRICT_ORIGIN'], true)`. Небезпечний запит без `Origin` і без `Referer` → 403 `origin_mismatch`.
- Порожній allowlist (можливий лише поза production-like, див. п. 2) — точне правило:
    - **ефективний allowlist** = множина валідних `new URL(x).origin` для `appConfig.url` (`APP_URL`) і `appConfig.frontendUrl` (`FRONTEND_URL`); невалідні або порожні значення відкидаються. Це конфігураційні адреси, а не origin поточного запиту;
    - якщо ефективний allowlist теж порожній — будь-який **коректний** Origin проходить перевірку списку (з warning при старті);
    - незалежно від allowlist **завжди** відхиляються `Origin: null` і некоректний Origin (п. 4);
    - відсутність і `Origin`, і `Referer` регулюється лише `strictOrigin`.
    - Обчислення ефективного allowlist — у `buildCsrfConfig`, один раз при старті.
- Звірити `http-routes.ts`: `csrf_guard` підключений лише до груп із `session_web`, тож вебхуки/службові POST без сесії guard не зачіпає. Звірити список маршрутів у PR.

## 4. Перевірка Fetch Metadata

**Файл:** `csrf-guard.ts`. Для небезпечних методів:

| `Sec-Fetch-Site`       | Дія                                                                 |
| ---------------------- | ------------------------------------------------------------------- |
| відсутній              | продовжити до Origin/Referer (старі браузери, не-браузерні клієнти) |
| `same-origin`          | продовжити до Origin/Referer і токена                               |
| `same-site`            | продовжити (Origin має бути в allowlist — перевірить крок 2)        |
| `none`                 | продовжити (для POST з `fetch` не трапляється; без пільг)           |
| `cross-site`           | 403 `fetch_site_cross_site` (топологія cross-site не підтримується) |
| будь-яке інше значення | 403 `fetch_site_invalid` (fail-closed)                              |

Кроку 2 додатково:

- `Origin: null` (sandbox iframe, `file://`, деякі редиректи) → 403 `origin_mismatch`;
- некоректний `Origin` (не парситься або `new URL(x).origin !== x`) → 403 `origin_mismatch`, без падіння на `Referer`;
- `Referer`, що не парситься → 403 (як і зараз).

Логування — через наявний `shouldContinueAfterViolation` з розширеним union `reason`; додати поле `secFetchSite` у лог.

**Тести** (`csrf-guard.spec.ts`): кожен рядок таблиці × enforce on/off; `Origin: null`; некоректний Origin; невідомий `Sec-Fetch-Site`; `same-origin` з неправильним токеном → 403 `token_mismatch` (Fetch Metadata не обходить токен).

## 5. Login CSRF

Login CSRF закривається пп. 1–4 разом: анонімна сесія з токеном існує ще до guard (`session-handler.ts:138`), тож перевірка токена вже застосовується до `/auth/login`. Зараз вона лише в режимі звітування. Відсутність cookie **не означає** `sessionInfo === null`.

Зміни в коді:

- `csrf-guard.ts:87`: гілку `sessionInfo === null → next()` замінити на fail-closed (403 `token_mismatch`), бо цей стан означає збій `session_web`, а не «анонімного користувача».

Очікувана поведінка (критерії приймання):

- **Холодний login:** `GET main/init` без cookie → 401 + `Set-Cookie` + `csrfToken` → `POST auth/login` з цією cookie й токеном → успіх, у відповіді новий `csrfToken`, cookie змінена.
- `POST auth/login` без cookie і без токена, навіть з власним `Origin` → **403 `token_mismatch`**. Новостворена анонімна сесія має токен, а запит його не містить.
- `POST auth/login` з чужим `Origin` → 403 `origin_mismatch`.
- Фронт: перший POST завжди йде після `init_app` (токен у пам'яті). Відновлення після `csrf_invalid` — див. п. 5a.

## 5a. Відновлення токена на фронті: автоматичний одноразовий retry

Зараз `base-api.ts:130` на `csrf_invalid` лише запускає `init_app` і повертає помилку виклику — повтору немає.

**Рішення: автоматичний retry**, бо інакше користувач бачить помилку на дію, яку можна було виконати.

- Retry виконується лише якщо `code === 'csrf_invalid'` **і** `reason === 'token_mismatch'`. Для `origin_mismatch`, `fetch_site_cross_site` і `fetch_site_invalid` повтор не допоможе: помилка повертається одразу, без оновлення.
- Ключова загроза: **жоден запит не має виконати дію від імені іншого користувача.** Cookie спільна для всіх вкладок. Сценарій: вкладка A показує користувача U1; у вкладці B зроблено logout і login як U2. Мутація з A має старий токен → 403 → токен у тілі 403 належить уже сесії U2. Відмінності токенів недостатньо — потрібне підтвердження незмінності користувача, і це стосується **не лише retry, а й наступних запитів**.

### Модель стану токена

Модуль `csrf-token.ts` тримає токен разом із користувачем, для якого його підтверджено:

- `confirmed: { token, userId } | null` — токен з результату, де відомо, кому належить сесія: `main/init` (200 → `user.id`, 401 → `null`) або успішна auth-відповідь (`login`/`register`/`logout` → користувач з тієї ж відповіді). Лише його `appendCsrfHeader` додає до запитів.
- `unconfirmed: string | null` — токен із відповіді, де користувач невідомий (тіло 403 від `attachCsrfToken`, інші відповіді ланцюга middleware). **Ніколи не відправляється** і не використовується для retry. Слугує лише сигналом «сесія змінилась, потрібне узгодження».
- `sessionState: 'synced' | 'reconciling' | 'diverged' | 'reloading'`:
    - `synced` — `confirmed.userId` збігається з користувачем у UI; мутації дозволено;
    - `reconciling` — триває `refreshSession()`; нові мутації **чекають** на його завершення (той самий single-flight проміс) і потім проходять ту саму перевірку;
    - `diverged` — попереднє оновлення не вдалося (мережа, 5xx, без валідного токена). Мутація в цьому стані **запускає `refreshSession()` або очікує вже запущений** (single-flight). Сам запит мутації (POST/PUT/PATCH/DELETE/upload) **не надсилається** до успішного узгодження. Оновлення успішне і користувач той самий → `synced`, мутація надсилається один раз з токеном з цього оновлення. Оновлення знову невдале → мутація відхиляється локально з `clientCode: 'session_unverified'`, стан лишається `diverged`. Користувач інший або сесія анонімна → та сама таблиця рішень, що й для retry (нижче);
    - `reloading` — **термінальний** стан: ухвалено рішення про перезавантаження (зміна акаунта). Жодні мутації не надсилаються і `refreshSession()` не запускається; будь-який результат запущеного раніше оновлення ігнорується і **не може повернути стан у `synced`** до завершення reload. Мутації відхиляються локально з `clientCode: 'account_changed'`.
- Поточна логіка `updateCsrfTokenFromResponse` (будь-який `csrfToken` у відповіді стає глобальним) замінюється цією моделлю.

### Алгоритм

1. **Перед відправкою** запит фіксує `expectedUserId` — id користувача, якого бачить інтерфейс (зі стору; `null` для анонімного) — і перевіряє `sessionState` (див. вище).
2. На 403 `token_mismatch` — `refreshSession()` через `main/init`.
3. `refreshSession()` — **внутрішній** виклик, що **не емітує жодних глобальних подій** (`unauthorized`, `init_app`) і не робить редиректів: він іде повз загальну обробку помилок `base-api.ts:130` (окремий низькорівневий `fetch` або прапорець `{ silent: true }`). Повертає класифікований результат:
    - 200 + валідний `csrfToken` → `{ ok, token, userId: user.id }`;
    - 401 + валідний `csrfToken` → `{ ok, token, userId: null }` (анонімна сесія; нормальна відповідь bootstrap, див. п. 5);
    - мережева помилка, 5xx, таймаут, будь-яка відповідь без валідного `csrfToken` → `{ ok: false }`.
      Проміс single-flight **очищається в `finally`** — і після успіху, і після помилки.
4. Рішення приймає **викликач для конкретного запиту**; глобальні події емітуються лише тут, після класифікації:

| Клас запиту                                                                                                                                                                            | Умова повтору                                          | Інакше                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Публічний auth** (`login`, `register/*`, `forgot/reset-password`, `reset-phone/*`, `verify-email`; позначається явно опцією `{ csrfRecovery: 'public' }` у виклику API, а не за URL) | `ok` і `userId === null` і `expectedUserId === null`   | `userId !== null` (інша вкладка вже увійшла) → без повтору, обробник зміни акаунта (нижче); **`unauthorized` не емітується**, редиректу на login немає |
| **Захищена мутація** (усе інше, за замовчуванням)                                                                                                                                      | `ok` і `userId !== null` і `userId === expectedUserId` | `userId === null` → `unauthorized` → `redirectToLogin()`; `userId !== expectedUserId` → обробник зміни акаунта, помилка `account_changed`              |
| Будь-який                                                                                                                                                                              | —                                                      | `ok: false` → **без повтору**, `sessionState = 'diverged'`, повернути початкову помилку 403                                                            |

5. Повтор — **максимум один**, з токеном **саме з результату цього `refreshSession()`** (не з довільного поточного глобального значення); результат повтору повертається викликачу як є.
6. При `ok` з тим самим користувачем — `confirmed = { token, userId }`, `unconfirmed = null`, `sessionState = 'synced'`.

### Обробник зміни акаунта

`initializeApp()` (`App.vue:132`) лише встановлює користувача й конфіг і не очищає стан попереднього (support-стор, push-підписки тощо); очищення живе окремо в `useSessionLifecycle.resetSessionScopedState()` (`useSessionLifecycle.ts:15`). Тому асинхронного `init_app` недостатньо.

**Рішення: повне перезавантаження сторінки** (`window.location.reload()` після скидання `confirmed`). Це єдиний спосіб гарантовано позбутися стану U1 у всіх сторах, компонентах і WebSocket без підтримки переліку «що очищати». Перед викликом `reload()` встановлюється `sessionState = 'reloading'` (термінальний, див. вище), тож до завершення перезавантаження мутації відхиляються, а запізнілий результат оновлення стан не змінює.

Альтернатива без перезавантаження (не обрана): `onAccountChanged()` у `useSessionLifecycle` — `websocketClose()` → `resetSessionScopedState()` (розширити на всі stores із даними користувача) → `userStore.clearUser()` → `initializeApp()` → `sessionState = 'synced'` лише після завершення. Вимагає підтримувати повний список сторів; повертатися до неї лише якщо перезавантаження неприйнятне для UX.

### Тип клієнтської помилки

`account_changed` і `session_unverified` — суто клієнтські; shared `ErrorCode` не розширюємо значеннями, яких бекенд ніколи не повертає. Зараз форма помилки HTTP задублювана: `ApiResponse.error` у `base-api.ts:13` і в `api.ts:55` (`{ message, code?, transportCode }`), а `ApiError` у `websocket-types.ts:24` — окремий тип для WS.

- Винести один тип `HttpApiError = { message: string; code?: ErrorCode; clientCode?: CsrfClientCode; transportCode: number }` (наприклад, у `utils/api-error.ts`) і використати його в обох `ApiResponse` (`base-api.ts`, `api.ts`), щоб `clientCode` бачили всі HTTP-викликачі. `CsrfClientCode = 'account_changed' | 'session_unverified'`.
- `websocket-types.ts` `ApiError` не змінюємо: WS-запити не проходять через `csrf_guard`.
- Заповнення полів:

| Ситуація                                                                                                   | `code`                                      | `clientCode`                             | `transportCode`                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| Сервер повернув 403 `token_mismatch`, оновлення не вдалося                                                 | `csrf_invalid` (з відповіді)                | `session_unverified`                     | `403`                                                                      |
| Сервер повернув 403, оновлення показало іншого користувача                                                 | `csrf_invalid` (з відповіді)                | `account_changed`                        | `403`                                                                      |
| Мутацію відхилено **локально** (`diverged` після невдалого оновлення або `reloading`), запит не надсилався | **відсутній** (не вигадуємо `csrf_invalid`) | `session_unverified` / `account_changed` | `0` — як для мережевої помилки (`base-api.ts:153`): HTTP-відповіді не було |

- Викликачі, яким потрібно відрізнити локальну відмову від мережевої помилки, перевіряють `clientCode`, а не `transportCode`.

### Інше

- Retry стосується і `http`, і upload-гілки (`base-api.ts:171`). Тіло запиту має бути повторно відправним: для upload — той самий `FormData`.
- Ідемпотентність: guard відхиляє запит до виконання обробника, тож повтор після `token_mismatch` не дублює побічних ефектів.

**Тести** (`frontend/src/utils/__tests__/base-api-csrf.spec.ts`, `csrf-token.spec.ts`):

- захищена мутація: `token_mismatch` → `init` 200 з тим самим `userId` → один повтор з токеном з `init` → успіх; повтор знову 403 → помилка, третьої спроби немає;
- **зміна акаунта:** `expectedUserId = U1`, `init` повертає U2 → повтору немає, `reload` викликано, `clientCode: 'account_changed'`; токен із тіла 403 не відправлено жодним запитом;
- **неперевірений токен не потрапляє в наступні запити:** UI U1 → cookie U2 → `token_mismatch` (403 з токеном U2) → `init` 503 → друга мутація: дозволено лише `GET main/init`; `init` знову 503 → мутація відхилена з `clientCode: 'session_unverified'`, `code` відсутній, `transportCode: 0`; **жодного POST/PUT/PATCH/DELETE/upload не надіслано**; токен U2 у заголовках жодного запиту не з'являється;
- `diverged` → наступна мутація запускає `init`; `init` 200 з U1 → стан `synced`, мутація надсилається рівно один раз з токеном з цього `init`;
- `diverged` → наступна мутація запускає `init`; `init` 200 з U2 → мутацію не надіслано, стан `reloading`, `reload` викликано;
- `reloading`: запізнілий результат `init` (200 з U1) не повертає стан у `synced`; нова мутація не надсилається і не запускає `init`;
- паралельна мутація під час `reconciling` чекає завершення оновлення і проходить ту саму перевірку користувача;
- захищена мутація: `init` → 401 → без повтору, `unauthorized` емітовано **після** класифікації;
- `refreshSession()` сам по собі не емітує `unauthorized` / `init_app` (шпигун на eventBus);
- публічний login: `init` → 401 + токен → один повтор → успіх, **без `unauthorized` і без редиректу**;
- публічний login: `init` → 200 (вже увійшов інший користувач) → без повтору, обробник зміни акаунта;
- `init` — network error / 503 / без `csrfToken` → без повтору, початкова помилка; наступний виклик знову робить `init` (проміс очищено);
- два паралельні запити → один `init`;
- `origin_mismatch` / `fetch_site_*` → без `init` і без повтору.

## 6. Ротація при переходах автентифікації (умовний пункт: аудит → мінімальні зміни)

**Контракт:**

- **Зміна автентифікації або рівня довіри** (вхід, підтвердження фактора, що змінює права, підвищення ролі) → **новий session ID + новий токен**, тобто `auth.login`. Ротація лише CSRF-токена **не замінює** зміну session ID і не захищає від session fixation ([OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)).
- Ротація лише токена (без зміни session ID) не є частиною жодного поточного потоку: `logout`/`logoutAll` (`session-handler.ts:221,274`) створюють нову анонімну сесію. `rotateCsrfToken()` додаємо **лише** якщо аудит знайде потік, якому вона потрібна.

**Відомий розрив (вже підтверджено):** `auth.login` (`session-handler.ts:190`) видаляє попередню сесію лише якщо в її даних є `userToken`. Анонімна сесія його не має, тож після входу стара анонімна сесія лишається в Redis до TTL. Прав користувача вона не отримує, але стара пара cookie/CSRF-токен лишається робочою як анонімна сесія. Виправлення: у `auth.login` видаляти попередню сесію завжди, з `ANON_TOKEN` для анонімної, так само як `contextUserToken`.

**Крок 1 — аудит** (результат таблицею в PR). Для кожного потоку зафіксувати: чи змінює він `userId` або права в сесії, чи викликає `auth.login`, чи інвалідує інші сесії. Потоки: `register/phone/complete-profile`, `register/phone/confirm`, `verify-email`, `reset-phone/complete`, `link-phone/confirm`, `link-email/*`, OAuth-callback, зміна ролі адміністратором (`services/admin/*`). Password reset уже інвалідує всі сесії (`password-reset-service.ts:633`) — лише підтвердити.

**Крок 2 — зміни лише для потоків з розривом.** Якщо потрібна ротація лише токена, новий `context.session.rotateCsrfToken()` у `session-handler.ts` має:

- записати новий токен у Redis;
- **переприсвоїти** локальну змінну `sessionInfo` у замиканні та `context.session.sessionInfo`. Нинішній `updateSessionData` (`session-handler.ts:169`) лише оновлює Redis і лишає в пам'яті старі дані, тож без цього відповідь і `attachCsrfToken` повернуть старий токен;
- повернути новий токен, який контролер віддає у відповіді (`csrfToken`).

Зміна ролі іншого користувача: інвалідувати його сесії (`destroyAllSessions`), а не ротувати токен.

**Тести** для кожного зміненого потоку:

- у відповіді новий `csrfToken`, відмінний від попереднього;
- **наступний запит із новим токеном приймається, зі старим — 403 `token_mismatch`**;
- для переходів автентифікації: session ID змінився; **запис попередньої сесії (анонімної чи автентифікованої) видалено з Redis**; запит зі старою парою cookie + CSRF-токен не приймається як попередня сесія (стара cookie → нова анонімна сесія з іншим токеном, а мутація зі старим токеном → 403 `token_mismatch`). Сама зміна `Set-Cookie` цього не доводить — перевіряти Redis і наступний запит.

## 7. Service Worker не кешує API

**Файл:** `packages/frontend/src/service-worker.ts`.

Проблема: гілка статики (`:279`) стоїть до перевірок методу й API і матчить підрядки (`/assets/`, `/icons/`, `.css`, `manifest.json`) у будь-якому URL. Через це cache-first може перехопити API-запит і навіть **non-GET** запит, якщо в URL трапився такий фрагмент.

Зміни:

- **Перші рядки `fetch`-обробника — ранній bypass** (без `respondWith`, браузер іде в мережу сам):
    - `request.method !== 'GET'` → bypass;
    - `url.origin !== self.location.origin` → bypass;
    - `url.pathname.startsWith(API_URL_PART)` → bypass.
      Прибрати нинішню network-first гілку для API GET з fallback на `caches.match`.
- `isStaticAsset` переписати на `pathname.startsWith('/assets/' | '/icons/' | ...)` або точний збіг (`/manifest.json`, `/favicon.svg`) замість `includes`.
- **Єдиний хелпер запису в кеш** `putIfCacheable(cache, request, response)` для всіх `cache.put` (статика, навігація, `install`): писати лише якщо `response.ok`, `response.type === 'basic'` і `Cache-Control` не містить `no-store`/`private`.
- `activate` уже видаляє чужі кеші. Додатково видаляти з поточного кешу будь-які записи під `API_URL_PART`: кеш старого SW міг їх містити.

**Тести:**

- Vitest: чистий класифікатор `classifyRequest({ url, method, destination, mode, swOrigin })` у `frontend/src/utils/` → `bypass` / `cache-first` / `network-first`. Кейси: API GET/POST, `/api/x/icons/y`, POST на `/icons/x`, cross-origin, `/assets/a.js`, навігація. Префікс API передається параметром (`apiPrefix`) і тестується з дефолтним `api` та нестандартним (`VITE_API_PATH_PREFIX`, напр. `v2/backend`); перевірити, що `/api-docs/x` не матчиться як API при префіксі `api`.
- Vitest: `putIfCacheable` з `no-store`, `opaque`, 500.
- **Playwright** (реальний SW у production-білді): після login та кількох API-запитів `caches.keys()` + `cache.keys()` не містять жодного URL під `/api/`. Сценарій оновлення: старий кеш із засіяним API-записом → новий SW активується → запис видалено.

## 8. Інтеграційні та e2e тести CSRF з реальним бекендом

Поточний `e2e/vue.spec.ts:3` лише перевіряє кнопку входу, а layout-тести мокають API — зелений suite не доводить роботу enforcement.

- Окремий Playwright-проєкт (або Vitest-інтеграція бекенду з Redis, як `logout-all-retry.redis.test.ts`) з **явно** заданими `CSRF_ENFORCE=true`, `CSRF_STRICT_ORIGIN=true`, `CSRF_ALLOWED_ORIGINS=<origin тестового сервера>`.
- Сценарії:
    1. холодний login (без cookie) через UI;
    2. logout → login у тій самій вкладці;
    3. **застарілий токен при чинній автентифікованій сесії** (сесія жива, токен у пам'яті фронту підмінено/застарів) → мутація → 403 `token_mismatch` → оновлення токена → один автоматичний повтор → успіх, ефект виконано рівно один раз;
    4. **втрачена сесія** (ключ видалено з Redis) **або logout в іншій вкладці** → мутація → 403/401 → перехід на login; захищена дія **не виконана** (перевірити стан), без зациклення запитів;
       4b. **зміна акаунта в іншій вкладці:** вкладка A — користувач U1; у вкладці B logout і login як U2 → мутація з A → 403 → `init` повертає U2 → повтору немає, UI вкладки A оновлено до U2, **дія не виконана ні від U1, ні від U2** (перевірити стан у БД); після перезавантаження у вкладці A **немає даних U1** (support-історія, push-стан, профіль);
    5. відхилена мутація (`fetch` з чужим `Origin` або без токена через `page.request`) → 403 і **відсутність побічного ефекту** (перевірити стан у БД/API: запис не створено).
- CI: якщо потрібні Redis/Postgres, підключити до наявного app-CI (`docs/plan/app-ci-plan.md`).

---

## Rollout

Перехід до enforcement має бути керованим і перевірюваним:

1. **Фаза діагностики (PR A+B з `CSRF_ENFORCE=false` у проді явно).** Нові правила (Fetch Metadata, strict origin, `Origin: null`) вже працюють у режимі звітування й логують `reason` + `secFetchSite`. Поточні логи не покажуть порушень правил, яких ще немає, тому спершу треба зібрати дані за новими правилами.
2. **Умови переходу:** ≥ 7 днів трафіку; нуль порушень від легітимних клієнтів (кожне `CSRF validation failed` пояснене: атака, бот або виправлений клієнт); `CSRF_ALLOWED_ORIGINS` задано і збігається з фактичними origin фронту.
3. **Перевірка env:** для кожного середовища зафіксувати фактичні значення `CSRF_ENFORCE`, `CSRF_STRICT_ORIGIN`, `CSRF_ALLOWED_ORIGINS`, `APP_ENV`/`APP_IS_PRODUCTION`. Явне `false` прибрати або змінити свідомо.
4. **Увімкнення:** `CSRF_ENFORCE=true` у staging → прогін e2e з п. 8 → прод. Відкат — повернути `CSRF_ENFORCE=false` і **перезапустити backend** (конфіг читається при старті); деплою коду не потрібно.
5. Production без `CSRF_ALLOWED_ORIGINS` після PR A не стартує — змінну додати в deploy-конфіг **до** мерджу.

## Документація (обов'язково за AGENTS.md)

- `documentation/backend/auth-security.md` — розділ «CSRF» (~242–260) і чекліст продакшену (~353): дефолти, Fetch Metadata, підтримувана топологія (same-origin/same-site), нові `reason`, обов'язковий allowlist для production-like, контракт ротації.
- `documentation/backend/configuration.md` — env-змінні.
- `packages/backend/.env.example`, `packages/backend/README.md`, `packages/frontend/README.md`.
- `pnpm docs:build && pnpm docs:verify`.

## Розбиття на PR

| #   | PR                                                                             | Пункти  | Залежності |
| --- | ------------------------------------------------------------------------------ | ------- | ---------- |
| A   | Конфіг: дефолти, `configError`, `validateRuntimeConfig`, warnings              | 1, 2, 3 | —          |
| B   | Guard: Fetch Metadata, `Origin: null`/malformed, fail-closed без сесії         | 4, 5    | A          |
| B2  | Фронт: модель стану сесії/токена, одноразовий retry, `HttpApiError.clientCode` | 5a      | B          |
| C   | Видалення анонімної сесії в `auth.login` + аудит переходів → мінімальні зміни  | 6       | —          |
| D   | Service Worker: bypass, `putIfCacheable`, очищення старого кешу                | 7       | —          |
| E   | Інтеграційні/e2e CSRF-тести з реальним бекендом                                | 8       | A, B, B2   |

C і D незалежні, їх можна робити паралельно. Перехід до enforcement у проді — після E і фази діагностики.

Перед стартом — запис у `feature_list.json` на `main` (feat `csrf-hardening`, owner, branch), згідно з AGENTS.md.

## Definition of Done

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter frontend test:e2e` (включно з новим CSRF-проєктом з п. 8) — зелені.
- Ручна перевірка golden path: холодний старт без cookie → `init` → login → POST → logout → login; те саме у встановленій PWA після оновлення білда (SW оновився, API в Cache Storage відсутній).
- Ручна негативна перевірка (enforce on): `curl -X POST` з `Origin: https://evil.example` → 403 `origin_mismatch`; з `Origin: null` → 403; без Origin/Referer → 403; з `Sec-Fetch-Site: cross-site` → 403 `fetch_site_cross_site`; з правильним Origin без токена → 403 `token_mismatch`.
- Документація оновлена, `docs:verify` проходить.
