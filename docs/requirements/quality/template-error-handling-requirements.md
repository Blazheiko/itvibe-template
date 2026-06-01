# Error Handling and Edge Case Requirements: itvibe-template

Last updated: 2026-05-30

## 1. API Error Envelope

| ID      | Status              | Requirement                                                                                                                        |
| ------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ERR-001 | Implemented pattern | API errors should be returned as structured response objects with a status, message, and machine-readable code where available.    |
| ERR-002 | Implemented pattern | Shared error codes should be exported from `shared/errors` and used by frontend/backend code instead of free-form string matching. |
| ERR-003 | Target              | All new backend routes should document possible error codes in route metadata or adjacent tests.                                   |

## 2. Validation Errors

| ID          | Status              | Requirement                                                                                                                    |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ERR-VAL-001 | Implemented default | Invalid HTTP body, query, path parameter, and WebSocket payloads should be rejected before controller business logic executes. |
| ERR-VAL-002 | Implemented default | Payloads larger than configured limits should return a payload-too-large error rather than being parsed.                       |
| ERR-VAL-003 | Target              | Frontend forms should map validation errors to field-level or form-level messages without exposing internal stack traces.      |

## 3. Token Expiry and Reuse

| ID            | Status              | Requirement                                                                                                              |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| ERR-TOKEN-001 | Implemented default | Email verification, email linking, password reset, and SMS challenge flows should reject expired tokens/challenges.      |
| ERR-TOKEN-002 | Implemented default | One-time tokens should not be reusable after successful consumption.                                                     |
| ERR-TOKEN-003 | Target              | Reusing an already-consumed verification/reset token should return a stable user-safe error message.                     |
| ERR-TOKEN-004 | Target              | Expired WebSocket tokens should prevent connection or route execution and require the frontend to request a fresh token. |

## 4. Idempotency and Duplicates

| ID            | Status | Requirement                                                                                                      |
| ------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| ERR-IDEMP-001 | Target | Repeated email verification for an already verified account should be safe and should not corrupt account state. |
| ERR-IDEMP-002 | Target | Repeated push subscription creation with the same endpoint should not create duplicate active subscriptions.     |
| ERR-IDEMP-003 | Target | Repeated logout should be safe and should return the user to an unauthenticated state.                           |

## 5. Conflicts

| ID               | Status              | Requirement                                                                                                             |
| ---------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| ERR-CONFLICT-001 | Implemented default | Duplicate email registration should not expose account existence beyond the intended generic response behavior.         |
| ERR-CONFLICT-002 | Implemented default | Duplicate phone registration/linking should be handled as a conflict and should not attach one phone to multiple users. |
| ERR-CONFLICT-003 | Target              | Conflict responses should use stable shared error codes so frontend copy can be localized consistently.                 |

## 6. External Service Failures

| ID          | Status | Requirement                                                                                                                    |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| ERR-EXT-001 | Target | SMTP failure should fail only the email-dependent operation and should not mark a token as delivered unless delivery succeeds. |
| ERR-EXT-002 | Target | S3 failure should fail media operations without changing unrelated user or article fields.                                     |
| ERR-EXT-003 | Target | AI provider failure should return a support-safe message and record enough context for diagnostics without leaking secrets.    |
