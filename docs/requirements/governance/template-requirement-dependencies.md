# Requirement Dependencies: itvibe-template

Last updated: 2026-05-30

## 1. Purpose

This document identifies major dependencies between requirements so downstream teams can
disable or remove optional features safely.

## 2. Dependency Matrix

| Requirement                            | Depends on                                    | Notes                                                                                  |
| -------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `FR-FE-003` Authentication UI          | `FR-API-003`, `FR-API-004`, `FR-API-005`      | Phone registration only works when phone auth is enabled and configured.               |
| `FR-FE-003A` OAuth Login UI            | `FR-API-012`, OAuth provider env config       | Provider buttons should match configured backend providers.                            |
| `FR-FE-006A` Contact Method Linking    | `FR-API-011`, SMS/email providers             | Phone linking requires SMS provider support; email linking requires SMTP for delivery. |
| `FR-FE-006B` Logout All Devices        | `FR-API-006`, session storage                 | Requires Redis-backed sessions to revoke server-side state.                            |
| `FR-FE-008` Support View               | `FR-WS-003`, `FR-API-018`, AI/support config  | AI provider is required for full support-agent behavior.                               |
| `FR-FE-010` Admin Knowledge Base UI    | `FR-API-019`, S3 storage, AI embeddings       | Screenshots require S3; reindexing requires embedding provider config.                 |
| `FR-API-016` Push Subscriptions        | VAPID config, browser permissions             | Test push depends on web-push configuration and active subscriptions.                  |
| `FR-WS-002` Admin Online Subscriptions | Redis/presence services                       | Multi-instance correctness depends on shared coordination.                             |
| `FR-AI-002` Embeddings                 | AI provider config, PostgreSQL vector support | Knowledge base retrieval depends on embeddings.                                        |
| `FR-OPS-007` Docker Build              | Workspace build scripts, env config           | Runtime still needs external PostgreSQL/Redis and secrets.                             |

## 3. Removal Guidance

When removing an optional feature, remove or disable these together:

- Phone auth: frontend phone flows, auth schemas, SMS provider config, phone reset/link routes.
- OAuth: provider buttons, OAuth routes, provider config, OAuth account persistence.
- Support AI: support chat UI, retained prompts, AI adapters, embeddings, usage reports.
- Push: service worker push logic, subscription UI, push routes, VAPID config.
- API playground: dev script and package, but keep route serialization if other tooling uses it.
