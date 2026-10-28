# Session Progress Log

## Current State

**Last Updated:** 2026-10-28
**Active Feature:** feat-043 - OAuth Email Verification and Configured Providers
**Branch:** `feat/oauth-email-verification` (stacked on `docs/restore-after-134`, PR #136)
**Plan:** `docs/plan/oauth-email-verification-plan.md`

## Status

### Done

- [x] Start: PR #135 (feature_list entry + plan; feat-042 closed)
- [x] Backend (`0cf9b5e`): `OAuthUserInfo.emailVerified` (Google `verified_email`, GitHub primary+verified from `/user/emails`, GitLab OIDC `email_verified` with `openid email` scopes, Facebook never); linking an existing user by email only for a verified email, otherwise `409` `oauth_email_unverified`; new users from a verified email get `emailVerifiedAt`; `isProviderConfigured` / `getConfiguredProviders`, unconfigured provider → not found; `GET /api/auth/oauth/providers`
- [x] Bug found on the way: callback errors returned `400` with a `Location` header (`mapControllerError` overwrote the `302`), so the browser never got back to the frontend. Every callback outcome is now a `302`; `reason=oauth_email_unverified` is appended to `OAUTH_FRONTEND_ERROR_URL`
- [x] Frontend (`4286c5f`): `SocialAuthButtons.vue` + `useOAuthProviders` (one request, cached, retried after a failure); buttons only for configured providers incl. GitHub and GitLab; no divider when none; register keeps the terms check (`interceptClick`); Login message for `reason=oauth_email_unverified`
- [x] Docs: `documentation/backend/oauth.md` (linking rule, providers route, unconfigured → 404, errors, adding a provider with `emailVerified` and `OAuthProviderSchema`)

### Not done

- [ ] Real login through a provider: needs real client credentials (only fake ones were used)
- [ ] `pnpm --filter frontend test:e2e` not run in this session

## Evidence of Completion

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — clean
- `pnpm test` — backend 998, frontend 126, shared 14, api-playground 14, documentation 26
- Mutation checks: disabling the linking guard fails 5 tests in `oauth-service.spec.ts`; the previous `oauth-controller.ts` fails 4 of 5 tests in `oauth-controller.spec.ts`
- `pnpm docs:build && pnpm docs:verify` — passed
- Manual check against the running backend (local Redis + PostgreSQL), fake credentials passed as env vars:
    - no `*_CLIENT_ID` set: `GET /api/auth/oauth/providers` → `{"providers":[]}`, `/google/redirect` → `404`, login modal has no social block and no divider
    - Google + GitHub set, GitLab with only a client id: providers → `["google","github"]`, `/gitlab/redirect` → `404`; `/github/redirect` → `302` to github.com with `client_id`, `state`, `scope=user:email` and the redirect URI
    - callback with a wrong `state` and with the right `state` + fake `code`: both `302 Location: /?error=oauth_failed` (logged `OAuth state mismatch`, `Failed to exchange authorization code`)
    - login modal in Chrome shows exactly Google and GitHub; `/login?error=oauth_failed&reason=oauth_email_unverified` shows the dedicated message, without `reason` the generic one

## Notes for Next Session

- Merge PR #136 first; this branch contains its three commits.
- Real-provider check: set real `GOOGLE_*` in `.env` and log in with a new email and with an email that already has a password account.
- Local frontend `.env` has `VITE_BASE_URL=http://localhost:5173`; when the docs dev server holds 5173 the app calls it instead of the backend (503).
- Out of scope (plan): linking social accounts from account settings, encrypting `oauth_accounts` tokens.
