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

- [ ] Manual golden path against a running backend: Redis was not running locally, so `GET /api/auth/oauth/providers` and a real Google login were not exercised by hand
- [ ] `pnpm --filter frontend test:e2e` not run in this session

## Evidence of Completion

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — clean
- `pnpm test` — backend 998, frontend 126, shared 14, api-playground 14, documentation 26
- Mutation checks: disabling the linking guard fails 5 tests in `oauth-service.spec.ts`; the previous `oauth-controller.ts` fails 4 of 5 tests in `oauth-controller.spec.ts`
- `pnpm docs:build && pnpm docs:verify` — passed

## Notes for Next Session

- Merge PR #136 first; this branch contains its three commits.
- Manual check: start Redis and PostgreSQL, set `GOOGLE_*` in `.env`, then `curl /api/auth/oauth/providers`, log in with Google (new email and an email that already has a password account), and blank one variable to see the button disappear.
- Out of scope (plan): linking social accounts from account settings, encrypting `oauth_accounts` tokens.
