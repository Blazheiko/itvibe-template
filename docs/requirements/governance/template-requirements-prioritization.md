# Requirements Prioritization: itvibe-template

Last updated: 2026-05-30

## 1. Method

This document uses MoSCoW priority tags:

- `Must`: core template behavior; removing it changes the template identity.
- `Should`: recommended production baseline; removable only with documented tradeoff.
- `Could`: useful optional capability.
- `Extension`: expected downstream customization or future production hardening.

## 2. Priority Matrix

| Requirement area                                       | Priority  | Rationale                                                                      |
| ------------------------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| Workspace scripts and shared contracts                 | Must      | The monorepo depends on these for type-safe development.                       |
| Backend HTTP routing, validation, and response schemas | Must      | Core API framework capability.                                                 |
| Session auth, CSRF, route guards, and admin guards     | Must      | Required for protected application behavior.                                   |
| Email login/register/reset/verification                | Must      | Baseline account lifecycle.                                                    |
| Frontend protected navigation and redirect behavior    | Must      | Required for usable authenticated flows.                                       |
| Account settings and avatar management                 | Should    | Important user-facing starter behavior.                                        |
| Phone auth and phone linking                           | Could     | Disabled by default and depends on SMS provider configuration.                 |
| OAuth login                                            | Could     | Useful but provider credentials are deployment-specific.                       |
| Push notifications                                     | Could     | Browser/device dependent and optional for many products.                       |
| Support AI chat and knowledge base                     | Could     | Valuable starter feature but removable for non-support products.               |
| Admin users, online users, and online history          | Should    | Useful operational baseline for authenticated apps.                            |
| AI prompt management and usage tracking                | Could     | Depends on AI provider adoption.                                               |
| API playground                                         | Should    | Important developer/QA productivity feature.                                   |
| Sentry observability                                   | Should    | Production baseline, but can be disabled locally.                              |
| Health/readiness/metrics                               | Extension | Expected for production, not currently a fully documented implemented surface. |
| Data export, account deletion, consent management      | Extension | Required for some compliance regimes, not currently core template behavior.    |

## 3. Safe Removal Guidance

Features most likely safe to remove for downstream products:

- phone authentication and phone linking when SMS is not needed
- OAuth providers that are not configured
- push notifications
- support AI, retained prompts, embeddings, and knowledge base
- API playground from production deployments

Features that should not be removed without replacing them:

- shared schemas and response contracts
- backend validation and structured errors
- session, CSRF, and route guards
- database migrations and verification scripts
- environment-driven configuration
