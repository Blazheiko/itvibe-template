# Non-Functional Requirements: itvibe-template

Last updated: 2026-05-30

## 1. Scope

This document defines baseline non-functional requirements for the production-oriented
`itvibe-template`. Items marked `Implemented default` describe behavior already visible
in the codebase. Items marked `Target` or `Extension point` define the expected bar for
downstream production adoption.

## 2. Performance

| ID           | Status              | Requirement                                                                                                                                                           |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-PERF-001 | Target              | Authenticated HTTP API endpoints should return p95 latency under 300 ms for non-AI, non-upload operations under expected production load.                             |
| NFR-PERF-002 | Target              | WebSocket command handling should acknowledge valid non-AI messages with p95 latency under 150 ms after the connection is established.                                |
| NFR-PERF-003 | Target              | Support AI responses may exceed normal HTTP/WS latency targets, but the UI should show progress or loading state within 500 ms.                                       |
| NFR-PERF-004 | Implemented default | WebSocket payloads are limited to 1 MB by the uWebSockets server configuration.                                                                                       |
| NFR-PERF-005 | Implemented default | HTTP body limits default to 2 MB for JSON/general requests, 50 MB for multipart requests, and 50 MB for octet-stream requests through `APP_MAX_*_BODY_SIZE` settings. |
| NFR-PERF-006 | Implemented default | The account avatar UI rejects source images larger than 10 MB before upload.                                                                                          |

## 3. Scalability

| ID            | Status              | Requirement                                                                                                                                                 |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-SCALE-001 | Target              | The backend should support horizontal scaling behind a load balancer when PostgreSQL and Redis are shared across instances.                                 |
| NFR-SCALE-002 | Implemented default | Sessions, rate limiting, and presence-related coordination are designed around Redis-backed runtime state.                                                  |
| NFR-SCALE-003 | Target              | WebSocket presence updates should remain consistent across backend instances through shared Redis/channel coordination or an equivalent production broker.  |
| NFR-SCALE-004 | Target              | Upload limits should be tuned per deployment to avoid memory pressure, using the formula `peak memory ~= concurrent uploads * max multipart body size * 2`. |

## 4. Availability and Fault Tolerance

| ID            | Status              | Requirement                                                                                                                                                                                    |
| ------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-AVAIL-001 | Target              | PostgreSQL unavailability should fail user-facing data operations with structured errors and should not return partial success responses.                                                      |
| NFR-AVAIL-002 | Target              | Redis unavailability should fail closed for sessions, CSRF validation, rate limits, and presence features.                                                                                     |
| NFR-AVAIL-003 | Target              | S3/object-storage unavailability should degrade only media flows such as avatar and screenshot upload/retrieval. Core authentication should remain available if it does not depend on storage. |
| NFR-AVAIL-004 | Implemented default | SMTP can be disabled, and email-dependent flows report delivery/configuration readiness rather than requiring SMTP for local boot.                                                             |
| NFR-AVAIL-005 | Target              | AI provider unavailability should degrade support AI and prompt testing while preserving non-AI account, admin, and navigation flows.                                                          |
| NFR-AVAIL-006 | Extension point     | Production deployments should define retry, timeout, circuit-breaker, and alerting policies for PostgreSQL, Redis, S3, SMTP, and AI providers.                                                 |

## 5. Limits and Retention

| ID            | Status              | Requirement                                                                                                                                                             |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-LIMIT-001 | Implemented default | Session cookie age defaults to 24 hours.                                                                                                                                |
| NFR-LIMIT-002 | Implemented default | SMS challenge TTL defaults to 10 minutes, resend cooldown defaults to 60 seconds, and invalid confirm attempts default to 5.                                            |
| NFR-LIMIT-003 | Target              | Support chat message length should have an explicit maximum before production launch. The current schema requires at least one character but does not define a maximum. |
| NFR-LIMIT-004 | Implemented default | Knowledge base screenshot uploads are limited to 5 MB and allow PNG, JPEG, and WebP files.                                                                              |
| NFR-LIMIT-005 | Extension point     | Presence history retention should be configurable by deployment, with a recommended default of 90 days unless product requirements require more.                        |
| NFR-LIMIT-006 | Extension point     | AI usage retention should be configurable by deployment, with a recommended default of 180 days for cost and audit review.                                              |
| NFR-LIMIT-007 | Extension point     | Support chat retention should be configurable by deployment and documented in the privacy policy.                                                                       |

## 6. Security and Compliance Baseline

| ID          | Status              | Requirement                                                                                                                                        |
| ----------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-SEC-001 | Implemented default | Production-like environments should set `APP_IS_PRODUCTION=true` and must not enable fake SMS providers.                                           |
| NFR-SEC-002 | Implemented default | CSRF can start in report-only mode and should be moved to enforce mode after rollout validation.                                                   |
| NFR-SEC-003 | Target              | All public production deployments should use HTTPS, secure cookies, strict origin configuration, and trusted proxy configuration where applicable. |
