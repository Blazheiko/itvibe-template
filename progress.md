# Session Progress Log

## Current State

**Last Updated:** 2026-10-21
**Active Feature:** feat-017 - Fix Mobile Layout E2E
**Branch:** `fix/mobile-layout-e2e`

Goal: the 8 failing Playwright tests in `packages/frontend/e2e/mobile-layout.spec.ts` (2 tests × 4 browsers) pass again, and they check what they claim to check.

## Status

### Done

- [x] PR #39: feat-017 → `in_progress`
- [x] Root causes: the test had drifted from the app, not a layout regression
  - registration: the modal opens on a choice step ("Continue with email" / "Continue with phone") when `VITE_AUTH_PHONE_ENABLED=true`, and the `.register-modal` class no longer exists (`.modal-overlay.show .modal`)
  - support: `App.vue` sets the user only with a non-empty `wsToken` (the mock sent `''`, so the guard redirected to `/login`); the history API returns messages in `data`, not `messages` (the view showed the empty state, which has no input)
  - geometry check: `boundingBox()` has no `bottom` field, so the assertion compared `undefined` and could never pass. It went unnoticed because nothing typechecked `e2e/` (`tsc -p e2e/tsconfig.json` on main reports `Property 'bottom' does not exist`)
- [x] Fixes in the spec: role-based locators inside the open modal, optional choice step, mock `wsToken` and `data`, `bottom = y + height`
- [x] `typecheck` of the frontend now also runs `tsc --noEmit -p e2e/tsconfig.json`
- [x] Docs: `documentation/reference/scripts.md` (frontend `typecheck`)
- [x] PR #40

## Files Modified

- `packages/frontend/e2e/mobile-layout.spec.ts` (also formatted with Prettier: it was not formatted on main)
- `packages/frontend/package.json` (`typecheck`)
- `documentation/reference/scripts.md`

## Evidence of Completion

- `pnpm --filter frontend test:e2e`: 12/12 (chromium, firefox, webkit, Mobile Safari), `--repeat-each=3`: 36/36; passes without a running backend
- The geometry check discriminates: with the viewport height set to 300 the registration test fails (`Expected <= 300, Received 497`); reverted
- `pnpm typecheck` (now including `e2e/`), `pnpm lint` clean
- `pnpm test`: backend 551, frontend 45, shared 3, documentation 26
- `pnpm docs:build && pnpm docs:verify`: all checks passed
- Not tested: the CI preview mode of Playwright (`CI=1`, `npm run preview` on 4173); there is no frontend CI job

## Notes for Next Session

- Merge PR #39 first, then PR #40; then flip feat-017 to `done` via PR to `main`.
