# Текст доповіді до презентації Backend Framework

Доброго дня. Сьогодні я презентую backend framework у проєкті `itvibe-template`, а саме пакет `packages/backend`. Це високопродуктивний HTTP та WebSocket сервер на базі `uWebSockets.js`, з PostgreSQL через Drizzle ORM, Redis-сесіями, ArkType-валідацією, вбудованими механізмами безпеки та підтримкою OAuth, Web Push і AI-адаптерів.

На початку коротко окреслю, про що йтиметься. Ми розглянемо технологічний стек, життєвий цикл HTTP-запиту, архітектурні шари Controller, Service, Repository і Transformer, а також маршрутизацію, middleware, валідацію, безпеку, сесії, WebSocket-інфраструктуру, документацію маршрутів, логування і тестування.

Основна ідея цього backend-фреймворку - поєднати продуктивність із чіткою структурою. Для HTTP і WebSocket використовується `uWebSockets.js`, для роботи з базою - Drizzle ORM і PostgreSQL, для сесій, pub/sub і presence - Redis. ArkType відповідає за схеми та типобезпечну валідацію, Pino - за структуроване логування. Також є інтеграції з MinIO/S3, Nodemailer, Arctic для OAuth, web-push і AI SDK-провайдерами.

Структура проєкту розділена за відповідальністю. У `controllers` знаходиться транспортний шар, у `services` - бізнес-логіка, у `repositories` - робота з базою, у `transformers` - перетворення рядків бази в API-відповіді. Окремо винесені маршрути, middleware, валідація, websocket-модулі, конфігурація, міграції, OpenAPI-заготовки та vendor-ядро фреймворку.

Для зручності використовуються path aliases: наприклад, `#app/*`, `#config/*`, `#vendor/*`, `#database/*`. Це робить імпорти коротшими й стабільнішими, особливо коли код розбитий на багато модулів.

Далі розглянемо request flow. Клієнт надсилає HTTP-запит, його приймає `uWebSockets.js`, після чого router знаходить маршрут за prefix, URL і методом. Далі синхронно збираються cookies, query, headers та IP. Потім ідуть rate limit, перевірка content-type і body-size, парсинг body, ArkType-валідація, створення `HttpContext`, виконання middleware і вже після цього controller викликає service, repository і transformer.

Важлива особливість `uWebSockets.js`: об'єкт `req` стає невалідним після першого `await`. Тому metadata потрібно зняти синхронно на самому початку. Саме для цього існує `collectRequestMetadata()`. Після цього весь pipeline працює не з raw `req/res`, а з безпечним `HttpContext`.

Архітектура тримається на чіткому поділі шарів. Controller відповідає за транспорт: читає payload, params, files і мапить помилки в HTTP-відповіді. Service містить бізнес-логіку і повертає `AppResult<T>`. Repository працює тільки з Drizzle-запитами. Transformer формує контракт відповіді: наприклад, перетворює `bigint` у string, дати в ISO-формат і приховує секретні поля.

Маршрути описуються декларативно через `defineRoute`. У маршруті задаються URL, HTTP-метод, handler, validator, response schema, middleware і rate limit. Наприклад, `POST /register/email` має ArkType-схему для body, після чого controller отримує типізований `HttpContext<RegisterEmailInput>`.

Маршрути можуть бути вкладені в групи. Prefix і middleware успадковуються по дереву. Це дозволяє, наприклад, задати `session_web` на рівні групи `main`, а для вкладеної групи `admin` додати `auth_guard`. У результаті маршрути залишаються компактними й читабельними.

Окремий блок - body size limits. Для JSON за замовчуванням ліміт 2 MB, для multipart і octet-stream - 50 MB. Якщо тіло завелике, сервер повертає 413, якщо content-type не дозволений - 415. Важливо, що ці перевірки виконуються до читання body, тобто сервер не витрачає пам'ять даремно.

Rate limiting реалізований як sliding window, per-process і in-memory. Його можна задавати на групі або на конкретному маршруті. У відповідь додаються стандартні headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, а при 429 - ще й `Retry-After`. Обмеження цього підходу: якщо є N інстансів, ефективний ліміт множиться на N.

Middleware має просту сигнатуру: отримує `context` і `next`. Якщо middleware не викликає `next()`, pipeline зупиняється. Так працюють guards, наприклад `auth_guard` або `admin_guard`. У kernel є вбудовані middleware: `session_web`, `session_api`, `csrf_guard`, `auth_guard`, `admin_guard`, `partner_guard`.

Валідація побудована навколо ArkType. Схема описується один раз і використовується в маршруті як `validator`. Після цього payload у controller вже типізований. Якщо маршрут не має validator, body навмисно відкидається, а `getTypedPayload()` кине помилку. Це fail-fast поведінка, яка допомагає швидко знаходити неправильні маршрути.

Query validation працює аналогічно. Якщо `queryValidator` не заданий, `httpData.query` буде `null`. Якщо заданий - query проходить ArkType-валідацію, отримує дефолти й типи. За замовчуванням режим strict: зайві ключі або повторювані параметри без `queryArrays` дають 422.

`HttpContext` - центральний об'єкт запиту. У ньому є `requestId`, request-scoped logger, payload, params, query, headers, cookies, files, responseData, session і auth. Завдяки цьому controller не залежить від raw server API.

На прикладі `registerByEmail` видно, що controller дуже тонкий. Він логує подію, дістає типізований payload, викликає `authService.registerByEmail`, передає auth, session, logger та IP. Якщо service повертає помилку - controller викликає `mapControllerError`; якщо успіх - повертає value.

Помилки централізовані через `AppError` і `AppResult<T>`. Service не кидає exceptions як основний механізм, а повертає результат: або успіх, або доменну помилку. Controller не виставляє статуси вручну. `AppError` мапиться в HTTP status, `Retry-After` і канонічний payload `{ status, code, message, reason? }`.

Repository - це межа бази даних. Він містить Drizzle-запити й нічого не знає про HTTP, сесії чи формат API-відповіді. Якщо repository кидає помилку, service ловить її через `tryInternal`.

Transformer відповідає за зовнішній контракт. Наприклад, `userTransformer` прибирає `password` та `isAdmin`, конвертує `bigint` id у string і форматує дати. Це важливо, бо API-контракт не має напряму залежати від структури рядка в базі.

База даних працює через `pg.Pool` і Drizzle. Є стандартні скрипти для створення бази, генерації й застосування міграцій, запуску Drizzle Studio та seed-даних. Схема описується через `pgTable`, наприклад таблиця `users` має id, name, email, password, avatar, role і timestamp-поля.

Сесії та auth API побудовані на Redis. Ключ має формат `session:{userToken}:{id}`, TTL - 24 години, а sliding expiration оновлює TTL при читанні. У session data зберігаються `userId`, `userToken`, `wsToken` і `csrfToken`. Login, logout і logoutAll ротують session id, що захищає від session fixation і створює новий CSRF-токен.

CSRF реалізований як synchronizer token. Unsafe-методи - POST, PUT, PATCH, DELETE - мають надсилати `X-CSRF-Token`. `csrf_guard` стоїть після `session_web` і перед `auth_guard`. OAuth redirect і callback не проходять через цей guard, бо там захист окремий - через OAuth `state`.

Для HTML є placeholder `__CSRF_TOKEN__`, який замінюється на токен сесії. Rollout зроблений обережно: спочатку можна увімкнути report-only режим через `CSRF_ENFORCE=false`, подивитися логи, полагодити клієнтів і лише потім поступово вмикати enforce.

Trusted proxy налаштовується через `TRUST_PROXY` і `TRUSTED_PROXY_CIDRS`. Це важливо, бо auth-throttles працюють за resolved client IP. Якщо неправильно довіряти proxy-заголовкам, можна послабити захист від abuse. Тому origin не має бути напряму доступним з інтернету, а proxy мають append-ити `X-Forwarded-For`.

Phone auth і SMS працюють за fail-fast політикою. За замовчуванням SMS provider - `unsupported`. Fake provider дозволений тільки явно і ніколи в production-like середовищі. Також потрібен достатньо довгий HMAC-ключ для OTP. Додатково є throttles per phone, per IP і per hour.

OAuth реалізований через Arctic для Google, GitHub, GitLab і Facebook. Redirect handler генерує authorization URL, state і PKCE code verifier, зберігає їх у сесії й робить 302. Callback порівнює state, перевіряє code verifier, створює або знаходить identity в `oauth_accounts` і виконує login.

WebSocket побудований за тією ж логікою, що й HTTP: є `defineWsRoute`, validators і rate limits. Відмінність у тому, що замість HTTP body pipeline використовується dispatcher для WS-повідомлень, а controller лежить у `controllers/ws`.

WS infrastructure складається з handshake authentication, local connection registry і Redis pub/sub coordinator. Auth виконується один раз при підключенні, а не на кожне повідомлення. Для кількох Node-інстансів Redis coordinator доставляє події між процесами.

Web Push доповнює WebSocket. Якщо користувач онлайн у WS, push можна не надсилати через `skipIfOnline`. Якщо VAPID-ключів немає, push не валить сервер, а fail-soft вимикається з warning. Підписки й результати відправок логуються в базу.

Також є throttles для email registration і linking, щоб захищатися від abuse і не розкривати існування акаунта. File uploads працюють через multipart, файл береться з `context.httpData.files`, після чого завантажується в S3 або MinIO.

AI SDKs винесені в адаптери з єдиним інтерфейсом `ITextAdapter`. Є підтримка OpenAI, xAI/Grok, Mistral та OpenAI embeddings. Спільні можливості - SSE streaming, tool calling, облік токенів і fail-soft поведінка, якщо API-ключ не налаштований.

Route docs будуються з ArkType-схем. Оскільки маршрути декларативні й містять `validator`, `queryValidator` і `ResponseSchema`, їх можна серіалізувати для doc endpoint і api playground. OpenAPI/Swagger поки є заготовкою, але фундамент уже готовий.

Логування побудоване на Pino. У межах запиту використовується `context.logger`, який scoped by requestId. Sentry доступний тільки через єдиний фасад `sentry-service`; напряму імпортувати `@sentry/node` не можна. У Sentry потрапляють лише `error` і `fatal`, а `warn` та `info` залишаються локальними.

Важливий конфігураційний принцип: `APP_ENV` - це описова назва середовища, а `APP_IS_PRODUCTION` - явний security-класифікатор. Для security-політик не можна парсити назву `APP_ENV`; у Docker, Helm або CI потрібно явно виставляти `APP_IS_PRODUCTION=true` для production-like середовищ.

Тестування виконується через Vitest. Є 48 spec-файлів: частина покриває vendor-ядро, зокрема router, server, validation, rate-limit, session, csrf-token і get-ip; інша частина покриває app-рівень - auth-service, OAuth, password reset, email verification, OTP hash, CSRF guard і ArkType adapter. Завдяки чистим шарам service можна тестувати без HTTP, а більшість логіки перевіряється детерміновано й без мережі.

На завершення: цей backend framework робить ставку на продуктивність `uWebSockets.js`, декларативні маршрути, єдиний schema engine ArkType, чисте розділення шарів і безпеку за замовчуванням. WebSocket, push, OAuth, AI-адаптери, логування, Sentry і route-docs інтегровані в одну архітектурну модель. Це дає backend, який можна розширювати без хаосу в коді й перевіряти через зрозумілі тести.
