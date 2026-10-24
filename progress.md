# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-023 - Storage Hardening (F06 of `docs/plan/open-issues-roadmap.md`, items 32, 44, 45, 46)
**Branch:** `feat/storage-hardening`
**Plan:** `docs/plan/storage-hardening-plan.md`; tasks: `docs/plan/open-issues-tasks.md`, F06

## Status

### Done

- [x] F06.S: PR #70 (feat-020 done, feat-023 `in_progress`, plan)
- [x] F06.1 (item 44): `buildKey` → exported `buildObjectKey`; `deleteFromS3` takes a relative key and adds the prefix; both `buildFullS3Key` copies removed (5 delete calls + KB screenshot CDN URL)
- [x] F06.2 (item 46): `vendor/utils/storage/detect-image-type.ts` — PNG / JPEG / WebP by magic bytes, `IMAGE_EXTENSIONS`
- [x] F06.3 (item 46): avatars and KB screenshots accepted only when the detected type is allowed and equals the declared multipart type (else the existing `400 Invalid file type`); S3 `ContentType` and key extension from the detected type, the client file name is ignored
- [x] F06.4 (item 45, decision R1): avatars uploaded with `publicRead: true`
- [x] F06.5 (item 32): `corsS3.xml` — GET/HEAD from a placeholder app origin, `MaxAgeSeconds`; `corsS3.prod.example.xml` for several origins
- [x] F06.D: `documentation/backend/storage.md` (keys, functions table, content check, public avatars + note about older private objects, CORS), `documentation/backend/deployment.md`; code-issues 32, 44, 45, 46 fixed
- Also: an eslint warning from feat-020 (`playwright/no-wait-for-timeout` in `e2e/mobile-layout.spec.ts`) — the fixed wait is intentional (it asserts a rate over time); disabled for that line with the reason

## Evidence of Completion

- RED first: `s3.spec.ts` (`buildObjectKey`; `deleteFromS3('avatars/7/a.png')` sends `Key: app/uploads/avatars/7/a.png`), `detect-image-type.spec.ts`, `avatar-service.spec.ts` (PNG named `evil.exe` → key `avatars/7/<uuid>.png`, `image/png`, `{ publicRead: true }`; non-image and JPEG-declared-PNG → `BadRequest`, no upload; old avatar deleted by its relative key), `knowledge-base-service.spec.ts` (mismatch → `BadRequest`); old fixtures with bytes `[1, 2, 3]` replaced by real headers (`src/test-support/image-fixtures.ts`)
- Manual (backend from source on 3999, disposable PostgreSQL and MinIO `RELEASE.2025-09-07T16-13-09Z`, bucket `itvibe-test`, demo user; Redis keys `manual-feat023:*` removed): PNG named `evil.exe` → 200, object `app/uploads/avatars/2/<uuid>.png`; then JPEG → 200, the bucket holds only the new `.jpg` (old object deleted — the relative-key `deleteFromS3` path works), `Content-Type: image/jpeg`; JPEG bytes declared PNG and an `MZ` executable declared PNG → 400, nothing stored. (MinIO does not enforce object ACLs, so `public-read` is covered by the unit test of the upload parameters.)
- `pnpm typecheck`, `pnpm lint` (0 problems), `pnpm format:check`, `pnpm build` — clean; `pnpm test` — backend 731, frontend 50, shared pass 3, documentation pass 26; `pnpm --filter frontend test:e2e` — 12 passed; `pnpm docs:build && pnpm docs:verify` — passed

## Files Modified

- new: `packages/backend/src/vendor/utils/storage/detect-image-type.ts` (+ spec), `packages/backend/src/test-support/image-fixtures.ts`, `corsS3.prod.example.xml`, `docs/plan/storage-hardening-plan.md` (PR #70)
- updated: `packages/backend/src/vendor/utils/storage/s3.ts` (+ spec), `packages/backend/src/app/services/user/avatar-service.ts` (+ spec), `packages/backend/src/app/services/support/knowledge-base-service.ts` (+ spec), `corsS3.xml`, `packages/frontend/e2e/mobile-layout.spec.ts`, `documentation/backend/{storage,deployment}.md`, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`

## Notes for Next Session

- Next: F07 WebSocket Cleanup (feat-024).
