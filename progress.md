# Session Progress Log

## Current State

**Last Updated:** 2026-10-25
**Active Feature:** feat-039 - Hide users.session_token
**Branch:** `feat/hide-session-token`

## Status

### Done

- [x] Start: PR #105
- [x] `user-transformer.ts` drops `sessionToken` (with `password`); `SerializedUser` omits it. Only `userTransformer` leaked it (login, registration, OAuth, phone link); `init`, the admin user list and the avatar responses already list fields explicitly; frontend, shared and playground never read it
- [x] Unused `userRepository.findBySessionToken` removed
- [x] Docs: `auth-security.md` — what `userToken` / `users.session_token` is and why it lives in PostgreSQL; `repositories-transformers.md`, `architecture.md`, `glossary.md`

## Evidence of Completion

- `user-transformer.spec.ts`: no `password` / `sessionToken` keys and no token value in the JSON; fails without the fix
- Manual on a fresh DB (`db:migrate` + `db:seed --demo`, backend on :3199): `POST /api/auth/login` → `success`, `user` keys: avatar, created_at, email, emailVerified, emailVerifiedAt, id, name, phone, role, updated_at; the DB `session_token` value is not in the response; `GET /api/main/init` with the cookie → `ok` with the user
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — clean; `pnpm test` passed (backend 858); `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed
