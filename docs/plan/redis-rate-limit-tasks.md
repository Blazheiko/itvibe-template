# Task list: rate limit для кількох інстансів (feat-013)

> **Статус:** виконано у feat-013 (PR #32, merge `28e1be8`, 2026-10-21). Невідмічений T9.3 (evidence) закрито в самому PR: див. `evidence` feat-013 у `feature_list.json`. Чекбокси заднім числом не відмічаються.

Джерело: [redis-rate-limit-plan.md](./redis-rate-limit-plan.md) (редакція 10).
Кожна задача атомарна (≤ 0.5 дня), з критерієм приймання (**AC**). Порядок послідовний, якщо не вказано інше; `→` — залежність. Після кожної задачі: `pnpm typecheck`, `pnpm lint`, `pnpm --filter backend test` зелені.

---

## Етап 0 — Підготовка

- [x] **T0.1** Злити PR #30 (feat-005 `done`, запис feat-013).
      **AC:** feat-013 є в `feature_list.json` на `main`.
- [x] **T0.2** → T0.1. PR у `main`: feat-013 — `owner`, `branch: feat/redis-rate-limit`, `status: in_progress`; у тому ж PR план і цей task list.
      **AC:** PR злито, рядок `in_progress`.
- [x] **T0.3** → T0.2. Гілка `feat/redis-rate-limit` від свіжого `main`; `progress.md` для feat-013 (мета, посилання на план і task list); `./init.sh`.
      **AC:** `init.sh` зелений, `progress.md` закомічено.

## Етап 1 — Окремий Redis-клієнт для лімітів (розділ 1)

- [x] **T1.1** `src/database/redis-rate-limit.ts`: друге з'єднання до того самого сервера (`config/redis.ts`), `enableOfflineQueue: false`, `maxRetriesPerRequest: 0`, `autoResendUnfulfilledCommands: false`, `commandTimeout` з `RATE_LIMIT_REDIS_TIMEOUT_MS` (стартово 50), обмежений `retryStrategy`, обробник `error` з логом не частіше разу на хвилину.
      **AC:** unit-тест перевіряє передані в ioredis опції (мок конструктора).
- [x] **T1.2** `RATE_LIMIT_REDIS_TIMEOUT_MS` у `config/rate-limit.ts` з валідацією (ціле ≥ 1) через `validateRuntimeConfig()`.
      **AC:** невалідне значення зупиняє старт; тест конфігу.
- [x] **T1.3** Закриття клієнта лімітів у `stopGracefully` (`src/index.ts`) поряд з основним Redis.
      **AC:** тест або перевірка, що `quit()` викликається при shutdown.
- [x] **T1.4** Тестовий хук примусового від'єднання клієнта лімітів з вимкненим reconnect (для сценарію «збій лише з'єднання лімітів»).
      **AC:** хук доступний лише тестам; не експортується в робочий код маршрутів.

## Етап 2 — Реєстр політик (розділ 7)

- [x] **T2.1** `src/config/throttle-policies.ts`: тип `ThrottlePolicy` (`scope`, `keyBy`, `algorithm`, `limit`, `windowMs`, `disableable?`, `onRedisError`, `resetOnSuccess?`), `readInt` з помилками конфігу в `validateRuntimeConfig()`.
      **AC:** тип і порожній реєстр компілюються; невалідний env дає помилку старту.
- [x] **T2.2** → T2.1. Внести всі наявні scope без зміни значень і ключів: `register_email_ip`, `register_email_identifier`, `register_phone_ip`, `sms_send_phone`, `confirm_phone_ip`, `reset_phone_ip`, `confirm_reset_phone_ip`, `link_phone_ip`, `confirm_link_phone_ip`, `link_email_target`, `link_email_user`, `link_email_user_cooldown`. Вікна — у `windowMs`.
      **AC:** для кожного scope значення `limit`, тривалість вікна **і фактичний Redis-ключ** `auth:throttle:<scope>:<key>` (з тим самим значенням `key`: IP, нормалізований email/телефон, userId) збігаються з поточними викликами — таблиця звірки в PR.
- [x] **T2.3** → T2.1. Тест реєстру: унікальні `scope`; `windowMs > 0`; `limit > 0`, крім `disableable` (`>= 0`); допустимі `keyBy`/`algorithm`; `0` у env для auth-політики → помилка конфігу.
      **AC:** тест зелений; навмисний дубль `scope` його валить.
- [x] **T2.4** → T1.1, T2.2. Новий API і міграція викликів **в одній задачі**, щоб проміжний стан компілювався: - `consumeAuthThrottle(policy, key)` і `resetAuthThrottle(policy, key)` на клієнті лімітів; Lua з `PEXPIRE windowMs` замість `EXPIRE`; формат ключа без змін; - перевести 11 викликів у `auth-service.ts` і 3 у `password-reset-service.ts` на `throttlePolicies.*`; - оновити моки в `auth-service.spec.ts`, `auth-service.regression.spec.ts`, `auth-phone-foundation.spec.ts`, `password-reset-service.spec.ts`, `auth-throttle-service.spec.ts`.
      **AC:** усі наявні тести зелені без зміни очікуваної поведінки; для кожного виклику тест (або звірка в PR) підтверджує той самий Redis-ключ, включно з `key`; у сервісах немає `consumeAuthThrottle({` з літералом (тест-пошук у вихідних кодах); помилка/таймаут Redis → виняток без повторного виклику.
- [x] **T2.5** → T2.4. Fail-closed на рівні запиту для всіх наявних потоків: помилка Redis у `consumeAuthThrottle` → сервіс повертає помилку, а побічна дія (відправка SMS/листа, створення користувача, перевірка коду) не запускається.
      **AC:** unit на кожен потік з T2.2 (мок helper кидає): операція відхилена, мок побічної дії не викликано.

## Етап 3 — WS upgrade, рівень 2 (розділи 2–3)

- [x] **T3.1** → T1.1. `vendor/utils/rate-limit/redis-sliding-log.ts`: Lua sliding-log на ZSET — `TIME`, `ZREMRANGEBYSCORE`, `ZCARD`, `ZADD` з member `<мкс>-<nonce>` (nonce — `crypto.randomUUID()` з `ARGV`), `PEXPIRE windowMs`, точний `retryAfterMs`, відхилені спроби не пишуться. Ключ — `rl:upgrade:<ip>` поверх `REDIS_PREFIX` (фактичний ключ у Redis: `<REDIS_PREFIX>rl:upgrade:<ip>`).
      **AC:** unit-тест обгортки (мок `evalsha`/`defineCommand`) перевіряє ключ `rl:upgrade:<ip>`; семантику перевіряє T7.2.
- [x] **T3.2** → T2.1. Політика `wsUpgradeShared` у реєстрі: `sliding-log`, `WS_UPGRADE_SHARED_RATE_LIMIT_MAX` (60, `min: 0`), `WS_UPGRADE_SHARED_RATE_LIMIT_WINDOW_MS` (60 000), `disableable: true`, `onRedisError: "skip"`.
      **AC:** тест реєстру зелений; `MAX=0` приймається.
- [x] **T3.3** Default `WS_UPGRADE_RATE_LIMIT_MAX` (рівень 1) 60 → 120 у `config/rate-limit.ts`.
      **AC:** тест конфігу оновлено.
- [x] **T3.4** → T3.1, T3.2. `checkUpgradeRateLimitShared(ip)`: `limit = 0` → дозвіл без Redis; помилка/таймаут → `skip`: дозвіл без другого звернення до `rateLimitStore` (рівень 1 уже спожив спробу) + `warn` не частіше разу на хвилину.
      **AC:** unit: вимкнено → Redis не викликається; помилка → дозвіл; при помилці Redis один upgrade споживає рівно одну локальну спробу (лічильник `rateLimitStore` для `upgrade:<ip>` зріс на 1, а не на 2).
- [x] **T3.5** → T3.4. `handleUpgrade`: рівень 1 (sync) → `await` рівень 2 → перевірка `aborted` → токен і сесія. Відповіді 429/503 як зараз.
      **AC:** unit (мок `res`): рівень 1 відмовляє → Redis не викликається; рівень 2 дозвіл / 429 / fallback; abort під час `await` для кожного з трьох результатів → жодного виклику `res.*`; наскрізно: `WS_UPGRADE_SHARED_RATE_LIMIT_MAX=0` → Redis не викликається, а вичерпання рівня 1 все одно дає 429.

## Етап 4 — Login (розділ 4)

- [x] **T4.1** `resolveLoginKey(identifier)` в `auth-service.ts`: email через `normalizeEmail`, телефон через локальний `normalizePhone` з налаштуваннями `login`; невалідний ідентифікатор → `null`. `login` використовує її і для пошуку.
      **AC:** unit: email у різному регістрі і телефон у різних форматах дають один ключ; поведінка пошуку не змінилася (наявні тести login зелені).
- [x] **T4.2** → T2.1. Політики `loginIp` (20 / 15 хв) і `loginIdentifier` (40 / 15 хв, `resetOnSuccess`) з `AUTH_LOGIN_MAX_ATTEMPTS_PER_IP`, `AUTH_LOGIN_MAX_ATTEMPTS_PER_IDENTIFIER`, `AUTH_LOGIN_WINDOW_SECONDS`.
      **AC:** тест реєстру зелений.
- [x] **T4.3** → T4.1, T4.2, T2.4. Передати IP у `authService.login` з `AuthController.login`; споживати `loginIp` і `loginIdentifier` (якщо ключ не `null`) атомарно **до** пошуку користувача; при вичерпанні — та сама відповідь, що й для невдалого входу.
      **AC:** unit: при вичерпаному бюджеті репозиторій і `validatePassword` не викликаються; однаковий інкремент для відсутнього акаунта, неправильного пароля й акаунта без пароля; невалідний ідентифікатор → лише IP-лічильник; невалідне тіло запиту (відхилене валідатором) не викликає `consumeAuthThrottle` (тест маршруту через `setHttpHandler` або валідатора); помилка Redis → вхід відхилено, `validatePassword` не викликається.
- [x] **T4.4** → T4.3. Після успішного входу `resetAuthThrottle(loginIdentifier, key)`; IP-лічильник не скидається.
      **AC:** unit-тест обох умов.
- [x] **T4.5** Уніфікувати відповідь для акаунта без пароля: `unauthorized("Invalid email or password")` замість `badRequest("Please use social login …")`.
      **AC:** unit: відповідь і HTTP-статус збігаються з відповіддю для відсутнього акаунта.
- [x] **T4.6** → T4.5. Фронтенд: у тексті загальної помилки входу — підказка «або увійдіть через соцмережу» (i18n-ключ у всіх локалях, що вже мають тексти входу).
      **AC:** `pnpm --filter frontend test` зелений; підказка видна на сторінці входу при помилці (ручна перевірка, скриншот у PR).

## Етап 5 — Решта auth-прогалин (розділ 5)

- [x] **T5.1** Передача IP у сервіси з контролерів, де її немає (`resetPassword`, `verifyEmail`, `resendVerificationEmail`, `forgotPassword`, `changePassword` — перевірити кожен).
      **AC:** сервіси отримують `{ ipAddress }`; наявні тести оновлено.
- [x] **T5.2** → T2.4. `change-password`: політика `changePasswordUser` (10 / 15 хв, ключ `userId`, `resetOnSuccess`), споживання до перевірки поточного пароля, скидання після успішної зміни.
      **AC:** unit: бюджет вичерпано або помилка Redis → `validatePassword` не викликається, запит відхилено; скидання після успіху.
- [x] **T5.3** → T2.4, T5.1. `forgot-password`: політики за IP і за нормалізованим email; throttle **до** пошуку адреси; однакова відповідь для наявної й відсутньої адреси. Пороги обрати за зразком `AUTH_*` і внести в таблицю «Прийняті рішення» плану.
      **AC:** unit: throttle викликається раніше за репозиторій; відповіді збігаються; бюджет вичерпано або помилка Redis → пошук адреси і відправка листа не запускаються; таблиця в плані оновлена.
- [x] **T5.4** → T2.4, T5.1. `resend-verification-email` (за користувачем/email), `reset-password` і `verify-email` (за IP). Пороги обрати за зразком `AUTH_*`, внести в таблицю «Прийняті рішення» плану.
      **AC:** для кожного з трьох потоків unit: бюджет вичерпано → операція відхилена, перевірка токена / відправка листа не запускається; помилка Redis → те саме (fail-closed); у межах бюджету — поведінка без змін. Таблиця в плані оновлена.

## Етап 6 — Конфіг

- [x] **T6.1** `.env.example`: `RATE_LIMIT_REDIS_TIMEOUT_MS`, `WS_UPGRADE_SHARED_RATE_LIMIT_*`, `AUTH_LOGIN_*`, змінні з T5.4; новий default `WS_UPGRADE_RATE_LIMIT_MAX=120`; коментарі «memory / Redis».
      **AC:** кожна нова змінна, яку читає код, є в `.env.example` (звірка, як у feat-006).

## Етап 7 — Тести з реальним Redis і CI

- [x] **T7.1** Скрипт `test:redis` у `packages/backend` (окремий vitest-конфіг або `include`), набір пропускається без `REDIS_TEST_URL`; кожен тест — у власному префіксі ключів.
      **AC:** `pnpm --filter backend test` не чіпає Redis; `REDIS_TEST_URL=… pnpm --filter backend test:redis` запускає набір.
- [x] **T7.2** → T3.1. Спільна таблиця кейсів sliding-log для in-memory store і Lua: однакові рішення, точний `retryAfterMs`, відхилені не пишуться; `PTTL` у діапазоні `(windowMs − δ, windowMs]`.
      **AC:** обидві реалізації проходять ту саму таблицю.
- [x] **T7.3** → T3.1. Конкурентні виклики з однаковим `TIME` не втрачають спроб і не перевищують `max`; два клієнти ділять один бюджет upgrade.
      **AC:** тест зелений.
- [x] **T7.4** → T2.4. `consumeAuthThrottle`: повторні відмови не збільшують `PTTL`; N ≥ M конкурентних спроб без успіхів і скидань допускають рівно M; після вікна бюджет відновлюється; `resetAuthThrottle` видаляє ключ.
      **AC:** тест зелений.
- [x] **T7.5** → T1.4, T3.5. Fallback → відновлення: примусове від'єднання клієнта лімітів → рівень 1; після повернення — бюджет з Redis; перевищення за вікно ≤ поріг рівня 1.
      **AC:** тест зелений.
- [x] **T7.6** → T7.1. `.github/workflows/redis-tests.yml`: на PR, сервіс `redis`, `pnpm install`, збірка `shared`, `test:redis` з `REDIS_TEST_URL`.
      **AC:** workflow зелений на PR; навмисно зламаний Lua його валить.

## Етап 8 — Документація (розділ «Документація»)

- [x] **T8.1** `auth-security.md`, розділ «Обмеження частоти запитів»: вступ із правилом вибору; таблиця локальних лімітів; таблиця спільних лімітів з реєстру (стовпці = поля `ThrottlePolicy`); login-політика; відмова Redis (обидва сценарії, `skip` для рівня 2 не гарантує WS-з'єднання; допустиме перевищення бюджету під час відмови — до N × поріг рівня 1 за вікно — і поведінка після відновлення Redis: спільний лічильник продовжується зі свого стану, локально пропущені спроби в нього не потрапляють); «Як додати ліміт» з двома прикладами; прибрати «не спільний між інстансами» з відкритих питань.
      **AC:** кожен рядок таблиці спільних лімітів відповідає політиці в `throttle-policies.ts` і навпаки.
- [x] **T8.2** `configuration.md`: нові змінні з defaults і посиланнями на файли.
      **AC:** усі змінні з T6.1 описані.
- [x] **T8.3** `websocket.md` (дворівневий upgrade, повідомлення per-instance за IP), `deployment.md` (nginx `limit_req` — опційний, спільний лише в межах одного nginx), пункт 2 у code-issues (✅ повністю).
      **AC:** `pnpm docs:build && pnpm docs:verify` зелені.

## Етап 9 — Перевірка і реліз

- [x] **T9.1** Ручна перевірка з двома процесами бекенду за одним Redis: upgrade-цикл по черзі на обидва порти → 429 від рівня 2; `login` з неправильним паролем по черзі → спільний ліміт, успіх скидає лічильник ідентифікатора; збій лише з'єднання лімітів → upgrade локально, з'єднання встановлюється, auth відхиляється; зупинка Redis → upgrade локально, з'єднання не автентифікується, auth відхиляється.
      **AC:** результати з командами й виводом у `progress.md`.
- [x] **T9.2** Вимірювання затримки до Redis у цільовому оточенні (p99) і вибір `RATE_LIMIT_REDIS_TIMEOUT_MS`; закрити останнє відкрите питання плану.
      **AC:** значення і вимір у плані та `.env.example`.
- [ ] **T9.3** Evidence of Completion у `progress.md` (typecheck, lint, test, test:redis, e2e фронтенду для зміни входу, docs, ручна перевірка); PR у `main`; після рев'ю й злиття — PR з feat-013 → `done`.
      **AC:** feat-013 `done` у `feature_list.json` з посиланням на evidence.

---

### Критичний шлях

T0 → T1.1 → T2.1 → T2.2 → T2.4 → T2.5 → (T3.x ∥ T4.x ∥ T5.x) → T6.1 → T7.x → T8.x → T9.x

Етапи 3, 4 і 5 незалежні після T2.5 і можуть іти окремими PR у гілку фічі.
