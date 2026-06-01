# Feature Flags and Configurability: itvibe-template

Last updated: 2026-05-30

## 1. Purpose

This document describes configuration-driven feature behavior and optional feature areas.
The current template primarily uses environment variables rather than a dedicated runtime
feature-flag service.

## 2. Configuration Model

| ID      | Status              | Requirement                                                                                                            |
| ------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| CFG-001 | Implemented default | Backend behavior is configured through environment variables under `packages/backend/.env.example` and `src/config/*`. |
| CFG-002 | Implemented default | Frontend build/runtime behavior uses `VITE_*` variables from `packages/frontend/.env.example`.                         |
| CFG-003 | Target              | Optional feature availability should be documented next to the env variables that enable it.                           |
| CFG-004 | Extension point     | A runtime feature-flag service may be added by downstream products if non-deploy-time toggles are required.            |

## 3. Optional Features

| Feature                   | Current control surface                                      | Notes                                                                   |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Strict email registration | `AUTH_STRICT_REGISTRATION`                                   | Controls whether email registration requires verification before login. |
| Phone auth                | `AUTH_PHONE_ENABLED`, `AUTH_SMS_PROVIDER`, `AUTH_*SMS*`      | Disabled by default; fake provider is local/test only.                  |
| CSRF enforcement          | `CSRF_ENFORCE`, `CSRF_ALLOWED_ORIGINS`, `CSRF_STRICT_ORIGIN` | Report-only by default; enforce for production after validation.        |
| Trusted proxy handling    | `TRUST_PROXY`, `TRUSTED_PROXY_CIDRS`                         | Enable only behind controlled proxy/load balancer.                      |
| Static serving/API docs   | `SERVE_STATIC`, `DOC_PAGE`, `API_PATH_PREFIX`                | Controls static frontend and route documentation surfaces.              |
| S3 storage                | `S3_*`                                                       | Required for avatar and screenshot storage flows.                       |
| SMTP email                | `SMTP_*`                                                     | Required for real email delivery.                                       |
| OAuth providers           | provider-specific OAuth env config                           | Required for OAuth login.                                               |
| Push notifications        | VAPID/push config                                            | Required for browser push delivery.                                     |
| Sentry                    | `SENTRY_*`, `VITE_SENTRY_*`                                  | Optional frontend/backend monitoring.                                   |
| AI providers              | `OPENAI_*`, `MISTRAL_*`, `XAI_*` where configured            | Required for support AI, prompt tests, embeddings, and usage tracking.  |

## 4. Downstream Toggle Rules

- If a feature is disabled, hide or remove its frontend entry points.
- Backend routes for disabled provider-backed features should fail closed with a clear structured error.
- Optional features should not block local development boot unless their routes are exercised.
- Production deployments should fail fast for unsafe combinations, such as fake SMS in production-like environments.
