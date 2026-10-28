---
layout: home

hero:
    name: vibe-template
    text: Full-stack TypeScript шаблон
    tagline: Готовий фундамент для SPA/PWA з акаунтами, real-time і AI. Документація з фокусом на бекенд.
    image:
        src: /logo.svg
        alt: vibe-template
    actions:
        - theme: brand
          text: Почати
          link: /guide/getting-started
        - theme: alt
          text: Як влаштований бекенд
          link: /guide/how-backend-works
        - theme: alt
          text: GitHub
          link: https://github.com/Blazheiko/vibe-template

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
    - icon: 🔔
      title: Web Push повідомлення
      details: Підписка на push у браузері, збереження підписок і відправка через VAPID вже вбудовані. Досить згенерувати ключі й додати їх у .env.
      link: /backend/mail-push#web-push
    - icon: 📱
      title: Інсталяція PWA
      details: Застосунок встановлюється на телефон і комп'ютер як нативний. Є маніфест, іконки, splash-екран, Service Worker з офлайн-кешем і повідомлення про нову версію.
      link: /frontend/#pwa
    - icon: 🤝
      title: Спільні контракти
      details: Пакет shared з arktype-схемами, enum-ами і типами відповідей. Якщо змінити спільний тип, TypeScript покаже, де фронтенд і бекенд з ним розійшлися.
      link: /shared/
    - icon: 🛠️
      title: Адмін-панель
      details: Список користувачів, хто зараз онлайн, історія онлайну і редактор бази знань для AI-чату. Окремий layout і доступ тільки для адміністраторів.
      link: /frontend/
    - icon: 🌍
      title: 18 мов і теми оформлення
      details: Інтерфейс перекладено vue-i18n на 18 мов. Світла й темна тема та кольорові палітри Ocean, Mint, Lavender, Rose, Sunset і Monochrome.
      link: /frontend/#i18n
    - icon: 📁
      title: Файли й пошта
      details: Завантаження файлів у будь-яке S3-сумісне сховище (AWS, MinIO, DigitalOcean Spaces). SMTP-листи для підтвердження пошти й скидання пароля.
      link: /backend/storage
    - icon: 🧪
      title: API Playground
      details: Окремий застосунок для локальної розробки, який показує всі HTTP- і WebSocket-маршрути бекенду і дає викликати їх вручну.
      link: /playground/
    - icon: 🤖
      title: AI-чат підтримки
      details: Чат, який відповідає з бази знань (pgvector), адмінка промптів, облік токенів, провайдери OpenAI, xAI і Mistral.
      link: /backend/ai
---

## Що таке цей шаблон

**vibe-template** — це не порожній «скелет», а **робочий застосунок**, з якого ви починаєте свій продукт. Зазвичай перші тижні нового проєкту йдуть на одне й те саме: реєстрація, логін, скидання пароля, сесії, CSRF, завантаження файлів, листи, push, адмінка, деплой. У цьому шаблоні все це вже написано, покрито тестами та задокументовано. Ви клонуєте репозиторій, налаштовуєте `.env` і одразу пишете **свою** бізнес-логіку.

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
- **Єдине джерело істини замість дубльованих типів.** Контракт API описано один раз arktype-схемою в пакеті `shared`: з неї бекенд перевіряє запит під час виконання, а тип виводиться (`typeof Schema.infer`) і імпортується і бекендом, і фронтендом. Структуру БД описано один раз Drizzle-схемою: з неї генеруються міграції й виводяться типи рядків (`InferSelectModel`). Змінили схему — `pnpm typecheck` показує всі місця на сервері й клієнті, які треба оновити. Як це влаштовано — [Звідки беруться типи](/guide/how-backend-works#звідки-беруться-типи-єдине-джерело-істини).
- **Передбачувана структура.** Кожна фіча складається з однакових шарів. Знаючи одну, ви орієнтуєтесь у всіх. Правила шарів перевіряються тестом, тому архітектура не «розпливається» з часом.
- **Безпечні значення за замовчуванням.** Більшість захистів (CSP, security-заголовки, rate limiting, HttpOnly-cookie) увімкнені одразу, а сервер не стартує з частиною небезпечних налаштувань (перевірка `validateRuntimeConfig`). Виняток — CSRF: за замовчуванням він лише логує порушення, для продакшену треба увімкнути `CSRF_ENFORCE=true`.
- **PWA і push одразу.** Застосунок можна встановити на пристрій з меню, а сервер уміє надсилати Web Push навіть коли вкладку закрито. Для push треба лише VAPID-ключі в `.env`.
- **Готово до продакшену.** Логи Pino, Sentry, health-check `/ready`, graceful shutdown, Dockerfile з healthcheck, конфігурація через env. Як зібрати й запустити — [Деплой](/backend/deployment).
- **Тести з коробки.** Понад тисячу unit- та інтеграційних тестів на Vitest. Тести з PostgreSQL створюють для себе окрему тимчасову базу, а Playwright перевіряє фронтенд у браузері. Детальніше — [Тестування](/backend/testing).
- **Приклади юридичних сторінок.** Privacy Policy, Terms, Cookies Policy і AI Policy вже мають маршрути й сторінки у фронтенді. Це **приклад-заготовка**, а не готовий юридичний текст: замініть зміст на свій і погодьте з юристом перед запуском.
- **Зручно для роботи з AI-агентами.** У репозиторії є `AGENTS.md` з правилами роботи і `feature_list.json` зі списком фіч, тож Claude Code чи інший агент працює за тими ж правилами, що й люди.

## Як це виглядає на практиці

Три приклади з коду шаблону, що показують, що дають ці переваги, коли ви змінюєте продукт.

### Змінили контракт — TypeScript показав, що зламалось

Список користувачів в адмінці описано однією схемою в `shared` ([admin-user-controller.ts](https://github.com/Blazheiko/vibe-template/blob/main/packages/shared/src/responses/admin-user-controller.ts)). Тип виводиться з неї, а не пишеться окремо:

```ts
export const AdminUserListItemSchema = type({
    id: 'string',
    name: 'string', // перейменуємо на fullName
    email: 'string',
    registeredAt: 'string',
})
export type AdminUserListItem = typeof AdminUserListItemSchema.infer
```

Після перейменування `name` → `fullName` TypeScript показує обидві сторони:

```text
packages/backend typecheck: src/app/controllers/http/admin/admin-user-controller.ts(29,37):
  error TS2322: Type 'AdminUserListItem[]' is not assignable to type
  '{ id: string; fullName: string; email: string; registeredAt: string; }[]'.
src/views/admin/AdminUsersView.vue(165,37): error TS2339: Property 'name' does not exist on type
  '{ id: string; fullName: string; email: string; registeredAt: string; }'.
```

`pnpm typecheck` зупиняється на першому пакеті з помилкою, тому помилку фронтенду видно після виправлення бекенду або в `pnpm --filter frontend typecheck`.

Без спільного типу бекенд почав би віддавати нове поле, а таблиця в адмінці мовчки показувала б порожню колонку. Та сама схема описує відповідь маршруту `GET /api/admin/users` в [API Playground](/playground/), тож документація API теж не розійдеться з типом.

::: warning Обмеження
Захист працює лише там, де обидві сторони справді імпортують тип з `shared`. `ResponseSchema` у маршрутах служить для опису API і не перевіряє відповідь під час виконання: захист відповіді дає TypeScript під час компіляції. Новий код варто писати так, як у прикладі вище: схема в `shared`, тип через `.infer`, і цей тип у сервісі, контролері й компоненті.
:::

### Один сервіс для HTTP і WebSocket

Чат підтримки працює через два транспорти: повідомлення йдуть по WebSocket ([ws/support-controller.ts](https://github.com/Blazheiko/vibe-template/blob/main/packages/backend/src/app/controllers/ws/support-controller.ts)), а історія чату завантажується по HTTP ([http/support/support-controller.ts](https://github.com/Blazheiko/vibe-template/blob/main/packages/backend/src/app/controllers/http/support/support-controller.ts)). Обидва контролери тонкі й викликають той самий `supportService`:

```ts
// WebSocket: нове повідомлення в чат
void supportService.chat(BigInt(userData.userId), payload.message, userData.uuid, context.signal)

// HTTP: історія чату
const result = await supportService.getChatHistory(userId)
```

Правила чату (ліміти, збереження історії, звернення до AI) живуть в одному місці. Якщо їх змінити, зміниться поведінка обох транспортів.

### Тест бізнес-логіки без бази даних

Сервіс отримує дані тільки через репозиторій, тому в тесті репозиторій легко підмінити. Фрагмент з [avatar-service.spec.ts](https://github.com/Blazheiko/vibe-template/blob/main/packages/backend/src/app/services/user/avatar-service.spec.ts):

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
