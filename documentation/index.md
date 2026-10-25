---
layout: home

hero:
    name: itvibe-template
    text: Full-stack TypeScript шаблон
    tagline: Готовий фундамент для SPA/PWA з акаунтами, real-time і AI. Документація з фокусом на бекенд.
    image:
        src: /logo.svg
        alt: itvibe-template
    actions:
        - theme: brand
          text: Почати
          link: /guide/getting-started
        - theme: alt
          text: Як влаштований бекенд
          link: /guide/how-backend-works
        - theme: alt
          text: GitHub
          link: https://github.com/Blazheiko/itvibe-template

features:
    - icon: 🔐
      title: Акаунти та вхід
      details: Реєстрація по email і телефону, підтвердження пошти, вхід через Google, GitHub і Facebook, скидання пароля, вихід з усіх пристроїв.
      link: /backend/auth-security
    - icon: ⚡
      title: Швидкий бекенд на uWebSockets.js
      details: HTTP і WebSocket в одному процесі. Код розкладено шарами route → controller → service → repository, тому зрозуміло, куди що писати.
      link: /backend/architecture
    - icon: 🛡️
      title: Безпека з коробки
      details: Сесії в Redis, CSRF, CORS, CSP і security-заголовки, rate limiting, захист від перебору паролів, довірені проксі.
      link: /backend/auth-security
    - icon: 🔄
      title: Real-time
      details: WebSocket-канал з авторизацією, хто онлайн, історія онлайну, push від сервера до клієнта.
      link: /backend/websocket
    - icon: 🤝
      title: Спільні контракти
      details: Пакет shared з arktype-схемами, enum-ами і типами відповідей. Якщо змінити спільний тип, TypeScript покаже, де фронтенд і бекенд з ним розійшлися.
      link: /shared/
    - icon: 🤖
      title: AI-чат підтримки
      details: Чат, який відповідає з бази знань (pgvector), адмінка промптів, облік токенів, провайдери OpenAI, xAI і Mistral.
      link: /backend/ai
---

## Що таке цей шаблон

**itvibe-template** — це не порожній «скелет», а **робочий застосунок**, з якого ви починаєте свій продукт. Зазвичай перші тижні нового проєкту йдуть на одне й те саме: реєстрація, логін, скидання пароля, сесії, CSRF, завантаження файлів, листи, push, адмінка, деплой. У цьому шаблоні все це вже написано, покрито тестами та задокументовано. Ви клонуєте репозиторій, налаштовуєте `.env` і одразу пишете **свою** бізнес-логіку.

Шаблон складається з трьох пакетів в одному репозиторії (pnpm workspace):

| Пакет      | Що це                                                               | Документація               |
| ---------- | ------------------------------------------------------------------- | -------------------------- |
| `backend`  | API-сервер і WebSocket на TypeScript + uWebSockets.js               | [Огляд бекенду](/backend/) |
| `frontend` | SPA/PWA на Vue 3 з Pinia, vue-router і vue-i18n                     | [Фронтенд](/frontend/)     |
| `shared`   | Схеми, типи та enum-и, які однаково імпортують і фронтенд, і бекенд | [Пакет shared](/shared/)   |

::: tip Новачок у проєкті?
Почніть з [Вступу](/guide/introduction), далі [Швидкий старт](/guide/getting-started) — локальний запуск за 10 хвилин. Потім прочитайте [Як влаштований бекенд](/guide/how-backend-works): там простими словами пояснено, що відбувається з запитом і навіщо кожен шар.
:::

## Чому саме цей шаблон

- **Не треба писати фундамент.** Автентифікація, безпека, пошта, файли, push, адмінка й AI вже працюють. Це тисячі рядків коду, які ви не пишете й не дебажите.
- **Продуктивність.** uWebSockets.js — один з найшвидших HTTP/WebSocket-серверів для Node.js за [публічними бенчмарками](https://github.com/uNetworking/uWebSockets/tree/master/benchmarks) (власних вимірювань для шаблону немає). Real-time не потребує окремого сервісу.
- **Типобезпека від БД до кнопки.** Drizzle ORM типізує запити до PostgreSQL, arktype перевіряє вхідні дані під час виконання, а пакет `shared` дає спільні типи для сервера і клієнта.
- **Передбачувана структура.** Кожна фіча складається з однакових шарів. Знаючи одну, ви орієнтуєтесь у всіх. Правила шарів перевіряються тестом, тому архітектура не «розпливається» з часом.
- **Безпечні значення за замовчуванням.** Більшість захистів (CSP, security-заголовки, rate limiting, HttpOnly-cookie) увімкнені одразу, а сервер не стартує з частиною небезпечних налаштувань (перевірка `validateRuntimeConfig`). Виняток — CSRF: за замовчуванням він лише логує порушення, для продакшену треба увімкнути `CSRF_ENFORCE=true`.
- **Готово до продакшену.** Логи Pino, Sentry, health-check `/ready`, graceful shutdown, Dockerfile з healthcheck, конфігурація через env.
- **Зручно для роботи з AI-агентами.** У репозиторії є `AGENTS.md` з правилами роботи і `feature_list.json` зі списком фіч, тож Claude Code чи інший агент працює за тими ж правилами, що й люди.

## Як це виглядає на практиці

Три приклади з коду шаблону, що показують, що дають ці переваги, коли ви змінюєте продукт.

### Змінили контракт — TypeScript показав, що зламалось

Список користувачів в адмінці описано одним типом у `shared` ([admin-user-controller.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/shared/src/responses/admin-user-controller.ts)):

```ts
export interface AdminUserListItem {
    id: string
    name: string // перейменуємо на fullName
    email: string
    registeredAt: string
}
```

Після перейменування `name` → `fullName` команда `pnpm typecheck` показує обидві сторони:

```text
packages/backend typecheck: src/app/controllers/http/admin/admin-user-controller.ts(29,37):
  error TS2322: Type '...admin-user-service...AdminUserListItem[]' is not assignable
  to type '...shared/dist/responses/admin-user-controller...AdminUserListItem[]'.
packages/frontend typecheck: src/views/admin/AdminUsersView.vue(165,37):
  error TS2339: Property 'name' does not exist on type
  '{ id: string; fullName: string; email: string; registeredAt: string; }'.
```

Без спільного типу бекенд почав би віддавати нове поле, а таблиця в адмінці мовчки показувала б порожню колонку.

::: warning Обмеження
Захист працює лише там, де обидві сторони справді імпортують тип з `shared`. Фронтенд поки використовує спільні типи вибірково, а `ResponseSchema` у маршрутах служить для опису API і не перевіряє відповідь під час виконання. Деякі типи (наприклад, `InitResponse`) написані вручну поруч зі схемою й допускають зайві поля, тож зміну схеми TypeScript там не помітить. Новий код варто писати так, як у прикладі вище: тип зі `shared` у сервісі, контролері й компоненті.
:::

### Один сервіс для HTTP і WebSocket

Чат підтримки працює через два транспорти: повідомлення йдуть по WebSocket ([ws/support-controller.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/controllers/ws/support-controller.ts)), а історія чату завантажується по HTTP ([http/support/support-controller.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/controllers/http/support/support-controller.ts)). Обидва контролери тонкі й викликають той самий `supportService`:

```ts
// WebSocket: нове повідомлення в чат
void supportService.chat(BigInt(userData.userId), payload.message, userData.uuid, context.signal)

// HTTP: історія чату
const result = await supportService.getChatHistory(userId)
```

Правила чату (ліміти, збереження історії, звернення до AI) живуть в одному місці. Якщо їх змінити, зміниться поведінка обох транспортів.

### Тест бізнес-логіки без бази даних

Сервіс отримує дані тільки через репозиторій, тому в тесті репозиторій легко підмінити. Фрагмент з [avatar-service.spec.ts](https://github.com/Blazheiko/itvibe-template/blob/main/packages/backend/src/app/services/user/avatar-service.spec.ts):

```ts
const userRepositoryMock = { findById: vi.fn(), update: vi.fn() }

vi.mock('#app/repositories/index.js', () => ({
    userRepository: userRepositoryMock,
}))

userRepositoryMock.findById.mockResolvedValue({ id: 7n, name: 'Alice', avatar: null })
const result = await avatarService.uploadAvatar(7n, file)
expect(Result.isOk(result)).toBe(true)
```

Тест перевіряє логіку завантаження аватара за мілісекунди, без PostgreSQL, Redis і S3.

## Що вже реалізовано

Нижче перелічено функціонал, яким можна користуватися одразу. Префікс API за замовчуванням — `/api` (`appConfig.pathPrefix`).

### Автентифікація та акаунт

| Можливість                    | Як це працює                                                                       | Детальніше                                             |
| ----------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Реєстрація по email           | `POST /auth/register/email`, лист з посиланням для підтвердження                   | [Автентифікація](/backend/auth-security#способи-входу) |
| Підтвердження email           | `POST /auth/verify-email`, повторна відправка `resend-verification-email`          | [Пошта та push](/backend/mail-push)                    |
| Реєстрація і вхід по телефону | SMS-код: `register/phone/start` → `confirm` → `complete-profile`                   | [Автентифікація](/backend/auth-security#способи-входу) |
| Вхід через соцмережі (OAuth)  | Google, GitHub, Facebook: `auth/oauth/:provider/redirect` і `/callback`            | [Автентифікація](/backend/auth-security#способи-входу) |
| Логін / логаут                | `POST /auth/login`, `/logout`, `/logout-all` (вийти на всіх пристроях)             | [Автентифікація](/backend/auth-security)               |
| Зміна і скидання пароля       | `change-password`, `forgot-password` → лист → `reset-password`; скидання через SMS | [Автентифікація](/backend/auth-security)               |
| Прив'язка телефону / email    | `link-phone/start`, `link-phone/confirm`, `link-email/start`                       | [Автентифікація](/backend/auth-security)               |
| Аватар користувача            | `POST /avatar/upload` (S3/MinIO), `DELETE /avatar`                                 | [Сховище файлів](/backend/storage)                     |
| Ролі                          | Звичайний користувач і адміністратор, guard-и `auth_guard` і `admin_guard`         | [Ролі та можливості](/reference/roles-capabilities)    |

### Безпека

| Можливість                | Що дає                                                                          | Детальніше                                                        |
| ------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Сесії в Redis             | HttpOnly-cookie з HMAC-підписом, ротація токена, миттєве відкликання сесії      | [Сесії](/backend/auth-security#сесіі)                             |
| CSRF-захист               | Токен для всіх запитів, що змінюють дані                                        | [CSRF](/backend/auth-security#csrf)                               |
| CORS                      | Whitelist дозволених доменів                                                    | [CORS](/backend/auth-security#cors)                               |
| CSP та security-заголовки | Content-Security-Policy, `X-Frame-Options` та інші заголовки на кожну відповідь | [Заголовки](/backend/auth-security#заголовки-безпеки-та-csp)      |
| Rate limiting             | Глобальні та помаршрутні ліміти, в пам'яті або спільні через Redis              | [Ліміти](/backend/auth-security#обмеження-частоти-запитів)        |
| Захист від перебору       | Throttling спроб входу, OTP-кодів і скидання пароля                             | [Політика входу](/backend/auth-security#політика-входу)           |
| Trust proxy               | Коректний IP клієнта за nginx / балансувальником                                | [Trust proxy](/backend/auth-security#trust-proxy-і-визначення-ip) |
| Валідація вхідних даних   | Кожен маршрут описує схему arktype; некоректний запит не дійде до вашого коду   | [Валідація](/backend/validation)                                  |

### Real-time (WebSocket)

- Одне WebSocket-з'єднання на клієнта, авторизоване коротким токеном (`GET /main/update-ws-token`).
- Власний протокол повідомлень і диспетчер WS-маршрутів, які описуються так само, як HTTP-маршрути.
- Відстеження, хто онлайн, та історія онлайн-активності (для адмінки).
- Розсилка подій від сервера конкретному користувачу або каналу (`broadcast-service`).
- Heartbeat і таймаути, щоб «мертві» з'єднання закривались самі.

Детальніше: [WebSocket](/backend/websocket).

### Сповіщення та пошта

- **Транзакційні листи** через SMTP (nodemailer): підтвердження email, скидання пароля. Є скрипт `send-test-email` для перевірки налаштувань.
- **Web Push** (VAPID): підписка, оновлення, деактивація, тестова відправка, журнал доставок і статистика по кожній підписці (`/push-subscriptions/*`).

Детальніше: [Пошта та push](/backend/mail-push).

### Файли

- Завантаження в S3-сумісне сховище (AWS S3, MinIO та ін.), presigned-посилання.
- Готовий приклад використання — аватари та скриншоти статей бази знань.

Детальніше: [Сховище файлів (S3)](/backend/storage).

### AI

- **Чат підтримки (Support AI):** відповідає на питання користувача на основі бази знань. Пошук релевантних статей через embeddings у PostgreSQL (pgvector), потокова відповідь через WebSocket, історія чату.
- **База знань:** CRUD статей, скриншоти, переіндексація однієї статті або всіх, початкове наповнення.
- **Промпти в БД:** системні промпти редагуються з адмінки без деплою, їх можна протестувати перед збереженням.
- **Облік токенів:** статистика використання AI.
- **Кілька провайдерів:** OpenAI, xAI (Grok), Mistral. Провайдер обирається змінною `AI_TEXT_DRIVER` або назвою моделі в промпті.

Детальніше: [AI-інтеграції](/backend/ai).

### Адмін-панель

- Список користувачів.
- Хто зараз онлайн (оновлюється в реальному часі через WebSocket) та історія онлайну.
- Керування базою знань і AI-промптами, статистика використання AI.

Доступ лише для ролі адміністратора — [Ролі та можливості](/reference/roles-capabilities).

### Фронтенд

- Vue 3 + Pinia + vue-router, guard-и маршрутів для авторизованих і адмін-сторінок.
- Готові сторінки: логін/реєстрація, підтвердження email, скидання пароля, акаунт, чат підтримки, адмінка, юридичні сторінки (Privacy, Terms, Cookies, AI Policy).
- **18 мов** інтерфейсу (vue-i18n), зокрема українська та англійська.
- **PWA:** встановлення на пристрій, офлайн-режим, push-сповіщення.
- HTTP-клієнт, який сам додає CSRF-токен і обробляє сесію; WebSocket-клієнт з перепідключенням.
- Unit-тести (Vitest) та e2e (Playwright).

Детальніше: [Фронтенд](/frontend/).

### Інфраструктура та якість

| Можливість      | Що є                                                                                     | Детальніше                                 |
| --------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| База даних      | PostgreSQL + Drizzle ORM, міграції, seed, скрипт створення БД                            | [База даних](/backend/database)            |
| Конфігурація    | Усе через змінні оточення, перевірка конфігурації при старті                             | [Конфігурація](/backend/configuration)     |
| Логи та помилки | Pino (структуровані логи), Sentry на бекенді й фронтенді                                 | [Observability](/backend/observability)    |
| Health-check    | `GET /ping` (процес живий), `GET /ready` (БД і Redis доступні)                           | [Деплой](/backend/deployment)              |
| Кешування       | Роздача статики з ETag і `Cache-Control`, процесні кеші                                  | [Кешування та ETag](/backend/caching-etag) |
| Тести           | Vitest для бекенду, тест, що стежить за правилами шарів архітектури                      | [Тестування](/backend/testing)             |
| API Playground  | Окремий dev-застосунок для ручного виклику HTTP і WS-маршрутів без Postman               | [API Playground](/playground/)             |
| Деплой          | Збірка в `dist`, graceful shutdown, робота за проксі, роздача фронтенду з того ж процесу | [Деплой](/backend/deployment)              |

## Автор

Шаблон розробив **Олександр Блажейко** ([GitHub](https://github.com/Blazheiko), [blazheiko@gmail.com](mailto:blazheiko@gmail.com)). Детальніше — на сторінці [Про автора](/reference/author).

## З чого почати

1. [Вступ](/guide/introduction) — для чого шаблон і кому він підходить.
2. [Швидкий старт](/guide/getting-started) — встановлення та перший запуск.
3. [Як влаштований бекенд](/guide/how-backend-works) — пояснення для початківців.
4. [Структура проєкту](/guide/project-structure) — де що лежить.
5. [Як додати фічу](/backend/adding-a-feature) — покроковий туторіал: від таблиці в БД до маршруту.
