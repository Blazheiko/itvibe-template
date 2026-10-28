# Task list: посилення CSRF-захисту

Джерело: [`csrf-hardening-plan.md`](./csrf-hardening-plan.md) (ревізія 6). Номери в дужках — пункти плану.

Кожен PR: `pnpm typecheck && pnpm lint && pnpm test` зелені, документація оновлена в тому ж PR, `pnpm docs:build && pnpm docs:verify` перед мерджем.

Порядок: 0 → A → B → B2 → E → Rollout. C і D можна робити паралельно після 0.

```
0 ─► A ─► B ─► B2 ─► E ─► Rollout
 ├─► C
 └─► D
```

---

## 0. Підготовка

- [ ] **T0.1** PR у `main`: запис у `feature_list.json` — `feat-csrf-hardening`, owner, branch `feat/csrf-hardening`, `status: in_progress`, dependencies `[]`.
- [ ] **T0.2** Створити гілку від `main`, `./init.sh` — зелений.
- [ ] **T0.3** `progress.md` на гілці: посилання на план і цей task list, поточний PR.
- [ ] **T0.4** Зафіксувати фактичні env усіх середовищ (`CSRF_ENFORCE`, `CSRF_STRICT_ORIGIN`, `CSRF_ALLOWED_ORIGINS`, `APP_ENV`/`NODE_ENV`/`APP_IS_PRODUCTION`, `APP_URL`, `FRONTEND_URL`) у `progress.md`. Додати `CSRF_ALLOWED_ORIGINS` у deploy-конфіг production-like середовищ **до** мерджу PR A; явно встановити `CSRF_ENFORCE=false` у проді на час фази діагностики.

---

## PR A — конфіг (п. 1, 2, 3)

- [ ] **A.1** `config/csrf.ts`: винести чисту функцію `buildCsrfConfig(env, { isProductionLike, appUrl, frontendUrl })`, що повертає `{ enforce, strictOrigin, allowedOrigins, effectiveAllowedOrigins, headerName, configError }`.
- [ ] **A.2** Дефолти: `enforce` → `true`, `strictOrigin` → `true`.
- [ ] **A.3** Валідація кожного елемента `CSRF_ALLOWED_ORIGINS`: `new URL(x).origin === x`, схема `http(s)` → інакше `configError` (будь-яке середовище).
- [ ] **A.4** `isProductionLike && allowedOrigins.length === 0` → `configError`.
- [ ] **A.5** `effectiveAllowedOrigins`: явний список, або (якщо порожній, лише не-production) множина валідних `.origin` з `APP_URL`/`FRONTEND_URL`.
- [ ] **A.6** `validate-runtime-config.ts`: `throw` на `csrfConfig.configError`; warnings — `isProductionLike && !enforce`; поза production — порожній **явний** `CSRF_ALLOWED_ORIGINS` (навіть якщо fallback з `APP_URL`/`FRONTEND_URL` непорожній) і окремий warning, якщо порожній і `effectiveAllowedOrigins`.
- [ ] **A.7** Константа `CSRF_REJECT_REASONS` (`origin_mismatch`, `token_mismatch`, `fetch_site_cross_site`, `fetch_site_invalid`) у `packages/shared` для бекенду й фронту.
- [ ] **A.8** Тести `buildCsrfConfig`: дефолти; явне `false` зберігається; невалідні origin (шлях, кінцевий `/`, `ftp:`, сміття); production-like через `APP_ENV=prod`, `NODE_ENV=production`, `APP_IS_PRODUCTION=true` без списку → помилка; dev-fallback з `APP_URL`/`FRONTEND_URL`.
- [ ] **A.9** Тест `validateRuntimeConfig`: `throw` на `configError`; warning при `isProductionLike && !enforce`; warning при порожньому явному списку поза production з непорожнім fallback; warning при порожньому `effectiveAllowedOrigins`.
- [ ] **A.10** Прогнати весь бекенд-suite з новими дефолтами; виправити тести, що робили мутації без Origin/токена (явно задавати заголовки, а не вимикати enforce).
- [ ] **A.11** Документація: `.env.example`, `documentation/backend/configuration.md`, `auth-security.md` (дефолти, обов'язковий allowlist, dev-fallback), `packages/backend/README.md`.

## PR B — guard (п. 4, 5)

- [ ] **B.1** `csrf-guard.ts`: крок Fetch Metadata за таблицею п. 4 (відсутній / `same-origin` / `same-site` / `none` → продовжити; `cross-site` → `fetch_site_cross_site`; інше → `fetch_site_invalid`).
- [ ] **B.2** Origin: `null` і некоректний Origin → `origin_mismatch` без падіння на Referer; перевірка проти `effectiveAllowedOrigins`.
- [ ] **B.3** Порядок: Fetch Metadata → Origin/Referer → токен; кожен крок лише відхиляє.
- [ ] **B.4** Гілку `sessionInfo === null → next()` замінити на fail-closed 403 `token_mismatch`.
- [ ] **B.5** Логування: `secFetchSite` у `shouldContinueAfterViolation`, union `reason` з `CSRF_REJECT_REASONS`.
- [ ] **B.6** Звірити `http-routes.ts`: усі групи з мутаціями мають `csrf_guard`; службові POST без `session_web` — перелічити в PR.
- [ ] **B.7** Тести `csrf-guard.spec.ts`: кожен рядок таблиці Fetch Metadata × enforce on/off; `Origin: null`; malformed Origin; невідомий `Sec-Fetch-Site`; `same-origin` + неправильний токен → `token_mismatch`; без Origin/Referer при strict on/off; fail-closed без сесії.
- [ ] **B.8** Тест login bootstrap (Redis-інтеграція): `GET main/init` без cookie → 401 + cookie + `csrfToken` → `POST auth/login` з ними → успіх; без токена з власним Origin → 403 `token_mismatch`; з чужим Origin → 403 `origin_mismatch`.
- [ ] **B.9** Документація: `auth-security.md` — Fetch Metadata, підтримувана топологія (same-origin/same-site), нові `reason`, login CSRF.

## PR B2 — фронт: модель сесії і retry (п. 5a)

- [ ] **B2.1** `utils/api-error.ts`: `HttpApiError` з `clientCode?: CsrfClientCode`; використати в `ApiResponse` у `base-api.ts` і `api.ts` (прибрати дублювання).
- [ ] **B2.2** `csrf-token.ts`: стан `confirmed: { token, userId } | null`, `unconfirmed`, `sessionState: synced | reconciling | diverged | reloading`. Замінити `updateCsrfTokenFromResponse`: `confirmed` оновлюється лише з `main/init` і успішних auth-відповідей з відомим користувачем; токен з 403 → `unconfirmed`.
- [ ] **B2.3** `appendCsrfHeader` бере лише `confirmed.token`.
- [ ] **B2.4** `refreshSession()`: окремий тихий `fetch` `main/init` без глобальних подій і редиректів; класифікація `{ ok, token, userId }` / `{ ok: false }`; single-flight з очищенням у `finally`; ігнорує результат у стані `reloading`.
- [ ] **B2.5** Опція `{ csrfRecovery: 'public' }` у `http`/`upload`; позначити нею публічні auth-виклики в `api.ts` (`login`, `register/*`, `forgot/reset-password`, `reset-phone/*`, `verify-email`).
- [ ] **B2.6** Фіксація `expectedUserId` перед відправкою; гейт за `sessionState` (`reconciling` → чекати; `diverged` → оновлення, без надсилання мутації; `reloading` → локальна відмова).
- [ ] **B2.7** Таблиця рішень retry для `token_mismatch`; один повтор з токеном з результату `refreshSession()`; без повтору для `origin_mismatch`/`fetch_site_*`.
- [ ] **B2.8** Глобальні події (`unauthorized`) — лише після класифікації для конкретного запиту.
- [ ] **B2.9** Обробник зміни акаунта: `sessionState = 'reloading'`, скинути `confirmed`, `window.location.reload()` (через інжектовану функцію для тестів).
- [ ] **B2.10** Заповнення `HttpApiError` за таблицею плану:
    - отримано 403, оновлення невдале → `code: 'csrf_invalid'`, `clientCode: 'session_unverified'`, `transportCode: 403`;
    - отримано 403, користувач змінився → `code: 'csrf_invalid'`, `clientCode: 'account_changed'`, `transportCode: 403`;
    - локальна відмова (запит не надсилався) → `code` відсутній, `clientCode: 'session_unverified' | 'account_changed'`, `transportCode: 0`.
- [ ] **B2.11** Upload-гілка: те саме, повтор з тим самим `FormData`.
- [ ] **B2.12** Прибрати старий `requestCsrfRecovery`/`init_app`-шлях з `base-api.ts`.
- [ ] **B2.13** Тести з п. 5a (`base-api-csrf.spec.ts`, `csrf-token.spec.ts`) — весь перелік тестів п. 5a, включно з U1 → U2 → `init` 503, `diverged` → U1 / U2, `reloading` + запізнілий `init`, публічний login без редиректу, single-flight і очищення після помилки. Кожен кейс з відмовою перевіряє **всі три поля** `code` / `clientCode` / `transportCode` для трьох варіантів з B2.10.
- [ ] **B2.14** Документація: `packages/frontend/README.md` (модель токена, `csrfRecovery`, `clientCode`).

## PR C — ротація і сесії (п. 6)

- [ ] **C.1** `session-handler.ts` `auth.login`: завжди видаляти попередню сесію (з `ANON_TOKEN` для анонімної).
- [ ] **C.2** Тест (Redis): після login запису попередньої анонімної сесії немає; стара cookie → нова анонімна сесія з іншим токеном; мутація зі старим токеном → 403.
- [ ] **C.3** Аудит потоків (таблиця в PR): `register/phone/confirm`, `register/phone/complete-profile`, `verify-email`, `reset-phone/complete`, `link-phone/confirm`, `link-email/*`, OAuth-callback, password reset (підтвердити `password-reset-service.ts:633`), зміна ролі адміністратором. Колонки: змінює `userId`/права? викликає `auth.login`? інвалідує інші сесії? розрив?
- [ ] **C.4** Для кожного розриву — мінімальна зміна (`auth.login` або `destroyAllSessions` для чужих сесій). `rotateCsrfToken()` — лише якщо аудит знайде потребу; тоді синхронізувати Redis, локальний `sessionInfo` і `context.session.sessionInfo`.
- [ ] **C.5** Тести на кожну зміну:
    - перехід автентифікації → новий session ID, старий Redis-запис видалено;
    - ротація лише токена (якщо з'явиться за C.4) → session ID збережено;
    - обидва випадки → **відповідь містить новий `csrfToken`**, відмінний від попереднього; запит із новим токеном приймається, зі старим → 403 `token_mismatch`.
- [ ] **C.6** Документація: `auth-security.md` — контракт ротації, результат аудиту.

## PR D — Service Worker (п. 7)

- [ ] **D.1** `utils/sw-request-policy.ts`: чиста `classifyRequest({ url, method, destination, mode, swOrigin, apiPrefix })` → `bypass | cache-first | network-first`.
- [ ] **D.2** `isStaticAsset` на `pathname.startsWith` / точний збіг замість `includes`.
- [ ] **D.3** `service-worker.ts`: ранній bypass (non-GET, cross-origin, API) першими рядками `fetch`; прибрати network-first з fallback для API.
- [ ] **D.4** `putIfCacheable(cache, request, response)`: `ok`, `type === 'basic'`, без `no-store`/`private`; використати в усіх `cache.put` (install, статика, навігація).
- [ ] **D.5** `activate`: видаляти записи під API-префіксом з поточного кешу.
- [ ] **D.6** Vitest: класифікатор (API GET/POST, `/api/x/icons/y`, POST `/icons/x`, cross-origin, `/assets/a.js`, навігація, `/api-docs/x`; префікс `api` і нестандартний) і `putIfCacheable` (`no-store`, `opaque`, 500).
- [ ] **D.7** Playwright на production-білді: після login і API-запитів у Cache Storage немає URL під API-префіксом; оновлення SW видаляє засіяний API-запис старого кешу.
- [ ] **D.8** Тест бекенду: API-відповіді мають `Cache-Control: no-store` (якщо ще немає).

## PR E — інтеграційні/e2e (п. 8)

- [ ] **E.1** Окремий Playwright-проєкт з реальним backend (Redis/Postgres), явно `CSRF_ENFORCE=true`, `CSRF_STRICT_ORIGIN=true`, `CSRF_ALLOWED_ORIGINS=<origin тестового сервера>`.
- [ ] **E.2** Сценарії: 1 холодний login; 2 logout → login; 3 застарілий токен при живій сесії → один повтор, ефект рівно один; 4 втрачена сесія / logout в іншій вкладці → login, дія не виконана; 4b зміна акаунта U1 → U2 → reload, дія не виконана, даних U1 немає; 5 відхилена мутація без побічного ефекту.
- [ ] **E.3** Підключити до app-CI (`docs/plan/app-ci-plan.md`).
- [ ] **E.4** Документація: `documentation/backend/testing.md`.

---

## Rollout

- [ ] **R.1** Задеплоїти A–E з `CSRF_ENFORCE=false` у проді (явно); переконатися, що логи містять `reason` і `secFetchSite`.
- [ ] **R.2** Допуск до enforcement — усі умови одночасно:
    - ≥ 7 днів діагностики з новими правилами;
    - кожне `CSRF validation failed` пояснене (атака / бот / виправлений клієнт), **невиправлених порушень від легітимних клієнтів немає**;
    - `CSRF_ALLOWED_ORIGINS` збігається з фактичними origin фронту (звірити з `Origin` у логах успішних мутацій);
    - **повторна перевірка актуальних env** усіх середовищ (ті самі змінні, що в T0.4) безпосередньо перед увімкненням; розбіжності з T0.4 пояснені.
- [ ] **R.3** `CSRF_ENFORCE=true` у staging + перезапуск → прогін E.
- [ ] **R.4** `CSRF_ENFORCE=true` у проді + перезапуск; моніторинг 403 `csrf_invalid` першу добу. Відкат — `false` + перезапуск.
- [ ] **R.5** Ручна перевірка DoD: golden path (браузер і встановлена PWA після оновлення білда); негативні `curl` (чужий Origin, `Origin: null`, без Origin/Referer, `Sec-Fetch-Site: cross-site`, без токена).
- [ ] **R.6** `progress.md` → Evidence of Completion; PR у `main`: `feature_list.json` → `done`.
