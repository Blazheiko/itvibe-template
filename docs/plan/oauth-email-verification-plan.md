# План: перевірка email в OAuth і кнопки лише налаштованих провайдерів

Дата: 2026-10-28. Фіча: `feat-043`. Базова гілка: `main` після PR #134 (сторінка `documentation/backend/oauth.md` уже в `main`).

## Поточний стан

- `oauthService.handleCallback` ([`oauth-service.ts`](../../packages/backend/src/app/services/auth/oauth-service.ts)) прив'язує OAuth-акаунт до наявного користувача з тим самим email, якщо провайдер повернув будь-який email. Чи підтверджено адресу, не перевіряється ні для одного провайдера.
- Хто що каже про підтвердження email:
    - **Facebook.** Graph API не має ознаки «email підтверджено». Поле `email` описано як основну адресу профілю; поле `verified` стосується акаунта, а не email. django-allauth за замовчуванням вважає email з Facebook непідтвердженим.
    - **GitLab.** `/api/v4/user` ознаки не дає. Вона є в OpenID Connect: claim `email_verified` з `/oauth/userinfo` за scope `openid email`.
    - **GitHub.** `email` з `/user` — публічна адреса. Код бере `/user/emails` (`primary && verified`) лише тоді, коли публічної немає.
    - **Google.** `/oauth2/v2/userinfo` повертає `verified_email`, але код його не читає.
- OAuth-користувачі створюються з `emailVerifiedAt = null`, навіть після Google.
- Кнопки у фронтенді ([`AuthModals.vue`](../../packages/frontend/src/components/AuthModals.vue)) зашиті: лише Google і Facebook. Чи налаштовано провайдера, ніде не перевіряється; з порожнім `*_CLIENT_ID` redirect веде до провайдера, і той показує свою помилку.
- `GET /main/init` для гостя повертає `401` без даних, тож список провайдерів через нього не передати.

## Бекенд

1. **`emailVerified` у профілі.** `OAuthUserInfo` отримує поле `emailVerified: boolean`, його заповнює кожен `fetch*UserInfo`:

    | Провайдер | Джерело `emailVerified`                                                                 |
    | --------- | --------------------------------------------------------------------------------------- |
    | Google    | `verified_email` з `/oauth2/v2/userinfo`                                                |
    | GitHub    | завжди `/user/emails`, адреса з `primary && verified`; інакше email порожній            |
    | GitLab    | scopes `openid email read_user`; `email_verified` з `https://gitlab.com/oauth/userinfo` |
    | Facebook  | завжди `false`                                                                          |

2. **Правило прив'язки** в `handleCallback`:
    - акаунт уже прив'язано (`provider` + `provider_user_id`) → вхід як зараз;
    - є користувач з таким email → прив'язка лише при `emailVerified === true`; інакше помилка `oauth_email_unverified` і редирект на `?error=oauth_email_unverified`;
    - користувача немає → створити; при `emailVerified` одразу `emailVerifiedAt = now`.

3. **Налаштованість провайдера.** `isProviderConfigured(provider)`: непорожні `clientId`, `clientSecret`, `redirectUri`. `getConfiguredProviders()`. `redirect` для ненастроєного провайдера → `404 Provider not configured`.

4. **Маршрут `GET /api/auth/oauth/providers`** у групі `auth/oauth`, без `auth_guard`. Відповідь `{ status: 'ok', providers: ('google' | 'facebook' | 'github' | 'gitlab')[] }`, схема — у `packages/shared/src/responses`.

## Фронтенд

5. `AuthModals.vue`: завантажити список провайдерів один раз (кеш у сторі), показувати кнопки лише для них, додати кнопки GitHub і GitLab, ховати блок соцмереж, якщо список порожній.
6. `Login.vue`: окреме повідомлення для `error=oauth_email_unverified` («Акаунт з цим email уже існує. Увійдіть паролем»). Ключ у всіх 18 локалях: англійський текст як fallback, український переклад.

## Тести

7. `oauth-service.spec.ts`: непідтверджений email + наявний користувач → без прив'язки, `oauth_email_unverified`; підтверджений → прив'язка; новий користувач з підтвердженим email отримує `emailVerifiedAt`; Facebook ніколи не прив'язується за email; GitHub бере лише `primary && verified`; розбір `email_verified` GitLab.
8. `isProviderConfigured`, маршрут `providers`, `404` для ненастроєного провайдера.
9. Unit-тест `AuthModals`: кнопки за списком провайдерів.

## Документація

10. `documentation/backend/oauth.md`: нове правило прив'язки (замість попередження), маршрут `providers`, помилка `oauth_email_unverified`, «ненастроєний провайдер → 404», кнопки за конфігом, оновлений крок «Фронтенд» у «Як додати провайдера». Таблиця маршрутів у `documentation/backend/auth.md`.

## Рішення

- **Facebook вважається непідтвердженим завжди.** Наслідок: користувач, який зареєструвався паролем, не зможе вперше увійти через Facebook з тим самим email. Прив'язка соцмереж із налаштувань акаунта — окрема задача, не в цій фічі.
- Наявні прив'язки в `oauth_accounts` не переглядаються: правило діє для нових прив'язок.

## Поза обсягом

- Прив'язка й відв'язка соцмереж у налаштуваннях акаунта.
- Шифрування `access_token`/`refresh_token` в `oauth_accounts`.

## Definition of Done

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter frontend test:e2e`, `pnpm docs:build && pnpm docs:verify`; ручна перевірка: вхід через Google з новим і наявним email, кнопки зникають без ключів.

Джерела: [Facebook Graph API: User](https://developers.facebook.com/docs/graph-api/reference/user), [django-allauth: Facebook](https://docs.allauth.org/en/dev/socialaccount/providers/facebook.html), [GitLab як OpenID Connect provider](https://docs.gitlab.com/17.6/integration/openid_connect_provider).
