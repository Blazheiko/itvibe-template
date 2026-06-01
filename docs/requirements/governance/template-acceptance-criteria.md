# Acceptance Criteria: itvibe-template

Last updated: 2026-05-30

## 1. Scope

This document connects core functional requirements to testable outcomes. It is not a
replacement for package tests; it provides QA-readable acceptance checks for the
requirements catalog.

## 2. Core Acceptance Criteria

### AC-AUTH-001 Login and Protected Redirect

Given an anonymous visitor opens a protected route, when the router guard runs, then the
visitor is redirected to `/login?redirect=<original-path>`.

Given the visitor completes login and app initialization succeeds, when a redirect query is
present, then the frontend navigates to the original protected route.

Evidence anchors: `FR-FE-002`, `FR-FE-003`, `packages/frontend/src/router/index.ts`,
`packages/frontend/src/App.vue`.

### AC-AUTH-002 Admin Guard

Given an authenticated non-admin user opens `/admin`, when the router guard resolves user
state, then the user is redirected to `/account`.

Evidence anchors: `FR-FE-002`, `packages/frontend/src/router/index.ts`.

### AC-AUTH-003 OAuth Login

Given OAuth providers are configured, when a user selects a social provider in the auth
modal, then the browser is sent to the backend OAuth redirect endpoint.

Given the backend redirects back with OAuth failure, when the login page loads, then an
OAuth failure message is shown.

Evidence anchors: `FR-FE-003A`, `FR-API-012`, `AuthModals.vue`, `Login.vue`.

### AC-ACCOUNT-001 Contact Method Linking

Given an authenticated user enters phone, current password, and optional country, when the
user starts phone linking, then the frontend calls the phone-link start API and moves to
code confirmation on success.

Given a valid challenge and code, when the user confirms, then the frontend updates the
current user state with the linked phone.

Given an authenticated user enters a target email and current password, when the user
starts email linking, then the frontend calls the email-link API and displays the backend
message.

Evidence anchors: `FR-FE-006A`, `FR-API-011`, `UserAccount.vue`.

### AC-SESSION-001 Logout and Logout All

Given an authenticated user logs out of the current session, when the backend call returns
or fails, then frontend session-scoped state is cleared and the user is returned to login.

Given a logout-all UI flow is added, when it calls `authApi.logoutAll`, then all server-side
sessions are invalidated and frontend session-scoped state is cleared.

Evidence anchors: `FR-FE-006B`, `FR-API-006`, `useSessionLifecycle.ts`, `api.ts`.

### AC-SUPPORT-001 Support Chat

Given an authenticated user opens support, when the chat is opened over WebSocket, then the
system returns the first assistant greeting.

Given the user sends a non-empty message, when the support chat route processes it, then the
message is persisted in chat history and an assistant response is returned.

Evidence anchors: `FR-FE-008`, `FR-WS-003`, `FR-DATA-007`.

### AC-ADMIN-001 Knowledge Base Administration

Given an administrator opens knowledge base management, when the list endpoint succeeds,
then articles are shown with create, edit, delete, screenshot, initialize, and reindex
actions available.

Given a non-admin user attempts to open admin routes, when guards evaluate, then access is
denied by frontend route guards and backend admin guards.

Evidence anchors: `FR-FE-010`, `FR-API-019`.

### AC-PUSH-001 Push Subscription Lifecycle

Given an authenticated user enables push notifications, when browser permission and
subscription creation succeed, then the subscription is stored and the UI reflects enabled
state.

Given a subscription exists, when update, deactivate, or delete is requested, then each
operation has a distinct backend effect: update modifies metadata, deactivate keeps the
record inactive, and delete removes the subscription.

Evidence anchors: `FR-API-016`, `UserAccount.vue`, `push-subscription-service.spec.ts`.

### AC-CSRF-001 Unsafe Request Protection

Given a cookie-backed session exists, when unsafe HTTP methods are used, then the frontend
sends `X-CSRF-Token` and the backend validates it according to report/enforce mode.

Evidence anchors: `FR-FE-019`, `FR-SEC-002`, `csrf-guard.spec.ts`,
`base-api-csrf.spec.ts`.

## 3. Verification Commands

The acceptance suite should be supported by:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm --filter frontend test:e2e` for UI-affecting changes
- focused package tests for changed behavior
