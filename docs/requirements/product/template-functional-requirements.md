# Functional Requirements: itvibe-template

Last updated: 2026-05-30

## 1. Purpose

This document describes the functional capabilities provided by the
`itvibe-template` full-stack TypeScript monorepo. It is intended to help product
owners, developers, QA engineers, and operators understand what the template can
do before it is customized for a specific product.

The template includes a Vue 3 frontend, a uWebSockets.js backend, a shared
contracts package, and an API playground. Functional requirements are written as
capabilities the template shall support out of the box or expose as extension
points.

## 2. Product Scope

The template shall provide a production-oriented starter system for authenticated
web applications with real-time features, administration, support automation,
push notifications, persistent storage, and type-safe frontend/backend
contracts.

The template shall not define a final business domain. Product-specific entities,
authorization policies, customer workflows, billing, and domain analytics are
expected to be added by downstream projects.

## 3. User Roles

### 3.1 Anonymous Visitor

An anonymous visitor can access public pages, start registration, start login,
request password reset, verify email by token, and view public legal or policy
content.

### 3.2 Authenticated User

An authenticated user can access the protected application shell, update account
information, manage avatar media, use support chat, manage session state, and use
browser/PWA capabilities such as push subscriptions.

### 3.3 Administrator

An administrator can access admin-only routes and screens for knowledge base
management, user lists, online user monitoring, online history, AI prompt
management, and retained AI usage reporting.

### 3.4 Developer or QA User

A developer or QA user can run the monorepo locally, use the API playground,
inspect serialized route documentation, test HTTP and WebSocket endpoints, run
database scripts, and execute the verification toolchain.

### 3.5 Operator

An operator can configure the application through environment variables, deploy
the Docker image, run database migrations, configure Redis, configure storage and
mail integrations, enable observability, and apply production security settings.

## 4. Workspace and Template Capabilities

### FR-WK-001 Monorepo Workspace

The system shall organize code as a pnpm workspace with separate packages for:

- `frontend`: the Vue 3 single-page application.
- `backend`: the HTTP and WebSocket server.
- `shared`: reusable schemas, response types, enums, guards, branded types, and
  utilities.
- `api-playground`: an interactive API documentation and testing application.

### FR-WK-002 Shared Type Contracts

The system shall expose shared request schemas, response schemas, error codes,
guards, enums, and utilities from the `shared` package so frontend and backend
code can use the same contract definitions.

### FR-WK-003 Development Scripts

The workspace shall provide root scripts to install dependencies, build shared
contracts, start frontend and backend development servers, start backend-only or
frontend-only development, run type checks, run linting, run formatting, run
tests, build all packages, and clean generated artifacts.

### FR-WK-004 Verification Bootstrap

The repository shall provide `./init.sh` as a one-command verification workflow
that installs dependencies and runs typecheck, lint, tests, and build.

### FR-WK-005 Feature Coordination Files

The repository shall include feature coordination files (`feature_list.json`,
`progress.md`, and `session-handoff.md`) so teams can track active feature
ownership, current status, handoff state, and completion evidence.

## 5. Frontend Application Capabilities

### FR-FE-001 Public Navigation

The frontend shall expose public routes for home/login, registration, email
verification, password reset, an about/manifesto page, privacy policy, terms,
cookies policy, and AI/content policy.

### FR-FE-002 Protected Navigation

The frontend shall protect account, support, and admin routes behind
authentication. When an anonymous user attempts to open a protected route, the
frontend shall redirect the user to `/login` with the original target stored in
the `redirect` query parameter. After successful initialization on `/`, `/login`,
or `/register`, the frontend shall route authenticated users to the intended
redirect target when present, or to the account page by default. Admin routes
shall additionally require admin privileges, and authenticated non-admin users
shall be redirected away from admin routes to the account page.

### FR-FE-003 Authentication UI

The frontend shall provide modal-based login and registration flows. Registration
shall support email registration and phone-registration stages where the backend
feature is enabled.

### FR-FE-003A OAuth Login UI

The frontend shall expose OAuth/social login entry points in the authentication
modals for configured providers used by the UI, including Google and Facebook.
The login page shall handle OAuth success redirects by reinitializing application
state and shall show an OAuth failure message when the backend redirects back
with an OAuth error.

### FR-FE-004 Email Verification UI

The frontend shall provide an email verification page that consumes a
verification token and reports the result to the user.

### FR-FE-005 Password Reset UI

The frontend shall provide password reset flows for token-based email reset and
phone-based reset where the backend feature is enabled.

### FR-FE-006 Account Settings

The frontend shall provide an account settings page where authenticated users can
view and update profile information through the backend user update API.

### FR-FE-006A Contact Method Linking

The frontend account settings page shall allow authenticated users to link a
phone number by entering a phone number, optional default country, current
password, and verification code. The account settings page shall also allow users
to start email linking by entering a target email address and current password.

### FR-FE-006B Logout From All Devices Capability

The frontend authentication API layer shall expose a logout-all-devices operation
that calls the backend `/api/auth/logout-all` endpoint. When this capability is
used by a UI flow, the frontend shall clear session-scoped state and return the
user to the login flow after the backend invalidates all sessions.

### FR-FE-007 Avatar Management

The frontend shall provide avatar editing with image cropping and upload support.
Users shall be able to remove an existing avatar.

### FR-FE-008 Support View

The frontend shall provide a protected support page backed by support APIs and
WebSocket support chat. Users shall be able to open support chat, send messages,
view chat history, and clear chat history.

### FR-FE-009 Admin Shell

The frontend shall provide an admin layout with navigation for knowledge base
management, users, online users, and online history.

### FR-FE-010 Admin Knowledge Base UI

The frontend shall allow administrators to list, create, edit, delete, initialize,
and reindex knowledge base articles. Administrators shall be able to upload and
delete screenshots for articles.

### FR-FE-011 Admin Users UI

The frontend shall allow administrators to list registered users, filter by user
ID and registration date range, and open a detail modal for a selected user.

### FR-FE-012 Admin Online Users UI

The frontend shall allow administrators to view currently connected users,
receive real-time online-user updates over WebSocket, and open a detail modal for
an online user.

### FR-FE-013 Admin Online History UI

The frontend shall allow administrators to view historical WebSocket connection
records, filter by user ID and date range, paginate through older records, and
inspect user details.

### FR-FE-014 Internationalization

The frontend shall support localization with vue-i18n and locale files for the
languages present in `src/locales`.

### FR-FE-015 Theme and Responsive UI

The frontend shall support light/dark theming, responsive layouts, application
headers, navigation controls, loaders, toast notifications, and mobile-friendly
views.

### FR-FE-016 PWA Capability

The frontend shall build a service worker, expose install-prompt behavior, and
show update notifications when a new service worker version is available.

### FR-FE-017 WebSocket Connection Status

The frontend shall maintain WebSocket connectivity for real-time features and
display connection status to the user.

### FR-FE-018 Frontend Observability

The frontend shall integrate Sentry through a dedicated service and composable so
components can report errors without importing the Sentry SDK directly.

### FR-FE-019 CSRF Handling

The frontend shall store and send CSRF tokens for unsafe cookie-backed HTTP
requests and refresh app state when CSRF recovery is required.

## 6. Backend HTTP API Capabilities

### FR-API-001 Route Definition and Validation

The backend shall define HTTP routes with method, URL, handler, validation
schema, response schema, middleware, description, content-type, and rate-limit
metadata.

### FR-API-002 Session-Based Browser API

The backend shall support cookie-backed browser sessions, CSRF middleware, auth
guards, admin guards, and session lifecycle operations.

### FR-API-003 Email Registration

The backend shall allow users to register by email and shall support strict
email-verification behavior when configured.

### FR-API-004 Phone Registration

The backend shall support a staged phone registration flow:

- start phone registration
- confirm the SMS challenge
- complete the profile and password setup

### FR-API-005 Login

The backend shall allow login by email or phone identifier.

### FR-API-006 Logout

The backend shall allow authenticated users to log out the current session and
log out all sessions/devices.

### FR-API-007 Password Management

The backend shall allow authenticated users to change or set a password.

### FR-API-008 Email Password Reset

The backend shall allow users to request a password reset email and complete
password reset using a one-time token.

### FR-API-009 Phone Password Reset

The backend shall support phone-based password reset start and completion flows.

### FR-API-010 Email Verification

The backend shall verify user email addresses using one-time verification tokens
and shall allow authenticated users to request a new verification email.

### FR-API-011 Account Linking

The backend shall allow authenticated users to start and confirm phone linking
and to start email linking for adding an email address to an existing account.

### FR-API-012 OAuth

The backend shall expose OAuth redirect and callback routes for configured
providers.

### FR-API-013 App Initialization

The backend shall provide an authenticated initialization endpoint that returns
current application/user state, storage configuration, WebSocket connection
details, and the CSRF token needed by the frontend. The `/api/main/init` route
shall be protected by `session_web`, `csrf_guard`, and `auth_guard`, so it
requires a valid authenticated session before returning application state.

The related `/api/main/save-user` route is intentionally different: it belongs to
the same `main` route group and therefore uses `session_web` and `csrf_guard`,
but it is not route-protected by `auth_guard`. It accepts a validated
`SaveUserInput` payload and creates a user record rather than loading the current
authenticated session user.

### FR-API-014 WebSocket Token Refresh

The backend shall provide an authenticated endpoint for refreshing the WebSocket
token.

### FR-API-015 User Save

The backend shall provide an endpoint for saving user profile data.

### FR-API-016 Push Subscription Management

The backend shall provide APIs to:

- return the VAPID public key
- create a push subscription
- list subscriptions
- retrieve one subscription
- update a subscription
- deactivate a subscription
- delete a subscription
- list subscription logs
- return subscription statistics
- send a test push notification to the current user

### FR-API-017 Avatar API

The backend shall allow authenticated users to upload avatar images using
multipart form data and delete existing avatars.

### FR-API-018 Support API

The backend shall allow authenticated users to retrieve support chat history,
delete support chat history, and retrieve screenshots associated with knowledge
base articles.

### FR-API-019 Admin Knowledge Base API

The backend shall allow administrators to:

- list knowledge base articles with query filtering/pagination
- get an article by ID
- create an article
- update an article
- delete an article
- upload an article screenshot
- delete an article screenshot
- reindex one article
- reindex all articles
- start knowledge base initialization from documentation files
- check knowledge base initialization status

### FR-API-020 AI Prompt Management API

The backend shall allow administrators to list retained support AI prompts, get a
prompt by type, update a prompt by type, and test a prompt with a user message.

### FR-API-021 AI Usage API

The backend shall allow administrators to retrieve retained support AI token usage
and aggregate usage statistics.

### FR-API-022 Admin User API

The backend shall allow administrators to list users with filters.

### FR-API-023 Admin Online User API

The backend shall allow administrators to list online users and retrieve detailed
online-user information by ID.

### FR-API-024 Admin Online History API

The backend shall allow administrators to list online-history records with
query-based filtering and pagination.

### FR-API-025 API Route Documentation Metadata

The backend shall serialize route metadata, validation schemas, response schemas,
middleware information, and rate-limit metadata so API documentation tools can
display and test the API.

## 7. Backend WebSocket Capabilities

### FR-WS-001 WebSocket Message Routing

The backend shall define WebSocket routes with URL, handler, validation schema,
response schema, description, route group, and rate-limit metadata.

### FR-WS-002 Admin Online Subscriptions

The backend shall allow administrators to subscribe and unsubscribe from real-time
online-user updates.

### FR-WS-003 Support Chat

The backend shall support WebSocket support chat operations:

- open a support chat and trigger the first greeting
- send a message to the support agent

### FR-WS-004 Presence Tracking

The backend shall track WebSocket presence, active connections, connection
duration, disconnect metadata, app type, user agent, and IP address where
available.

### FR-WS-005 WebSocket Rate Limiting

The backend shall apply rate limits to WebSocket route groups.

## 8. Data and Persistence Capabilities

### FR-DATA-001 PostgreSQL Persistence

The backend shall persist application data in PostgreSQL through Drizzle ORM.

### FR-DATA-002 User Data

The backend shall persist user records with name, email, optional phone,
password, avatar, role/admin state, session token, and timestamps.

### FR-DATA-003 Auth Token Data

The backend shall persist email verification tokens, email-link verification
tokens, password reset tokens, SMS auth challenges, and OAuth account links.

### FR-DATA-004 Presence Data

The backend shall persist online-session and connection-history data for
administrative monitoring.

### FR-DATA-005 Push Notification Data

The backend shall persist push subscriptions, device/browser metadata, and push
notification logs.

### FR-DATA-006 Support Knowledge Base Data

The backend shall persist support knowledge base articles, categories, active
state, screenshot references, and embeddings.

### FR-DATA-007 Support Chat History

The backend shall persist support chat messages by user, role, content,
associated screenshots, and creation time.

### FR-DATA-008 AI Prompt and Usage Data

The backend shall persist retained LLM prompt definitions and text usage records,
including model, feature, final prompt, token counts, and creation time.

### FR-DATA-009 Redis Runtime State

The backend shall use Redis for sessions, rate limiting, presence coordination,
and other runtime state required by full application behavior.

### FR-DATA-010 S3-Compatible Storage

The backend shall support S3-compatible object storage for uploaded files such as
avatars and knowledge base screenshots.

## 9. AI and Support Automation Capabilities

### FR-AI-001 Provider Adapters

The backend shall include adapters for supported AI providers, including OpenAI,
Mistral, and xAI where configured.

### FR-AI-002 Embeddings

The backend shall generate and store knowledge base embeddings for support search
and retrieval workflows.

### FR-AI-003 Query Translation

The backend shall support support-query translation as a retained prompt feature.

### FR-AI-004 Prompt Testing

The backend shall allow administrators to test retained support AI prompts before
using them in support chat workflows.

### FR-AI-005 Usage Tracking

The backend shall record retained AI text usage with token counts for support
chat, query translation, and prompt testing.

## 10. Notification Capabilities

### FR-NOT-001 Email Sending

The backend shall support SMTP-backed transactional email for features such as
verification, password reset, and other notifications.

### FR-NOT-002 Push Notifications

The backend shall support Web Push subscriptions, delivery attempts, delivery
logs, test sends, and subscription statistics.

### FR-NOT-003 Telegram Configuration Surface

The backend environment reference shall include Telegram-related configuration
for downstream notification integrations.

## 11. Security Capabilities

### FR-SEC-001 Authentication Guards

The backend shall enforce authenticated access for protected HTTP routes and
privileged access for admin-only routes.

### FR-SEC-002 CSRF Protection

The backend shall implement synchronizer-token CSRF protection for cookie-backed
unsafe HTTP methods and shall support report-only and enforce modes.

### FR-SEC-003 CORS Configuration

The backend shall support CORS origin configuration for browser clients.

### FR-SEC-004 Rate Limiting

The backend shall apply route-level or route-group rate limits to sensitive HTTP
and WebSocket operations.

### FR-SEC-005 Trusted Proxy Handling

The backend shall support explicit trusted-proxy configuration for forwarded
client IP extraction.

### FR-SEC-006 Production Safety Checks

The backend shall support production classification and fail-fast checks for
unsafe settings such as fake SMS providers in production-like environments.

### FR-SEC-007 Input Validation

The backend shall validate request body, query, and WebSocket payloads using
shared schemas and shall reject invalid payloads with structured errors.

### FR-SEC-008 Sensitive Data Masking

The backend shall provide utilities for masking sensitive values in logs and
diagnostic output.

## 12. Observability and Operations Capabilities

### FR-OPS-001 Backend Logging

The backend shall use structured logging for runtime events, warnings, and
errors.

### FR-OPS-002 Backend Error Monitoring

The backend shall integrate Sentry for error and performance monitoring when
enabled.

### FR-OPS-003 Frontend Error Monitoring

The frontend shall integrate Sentry for browser-side error and performance
monitoring when enabled.

### FR-OPS-004 Environment-Driven Configuration

The backend shall read runtime configuration from environment variables grouped
by app, database, Redis, routing, security, storage, mail, observability, auth,
AI, support, and translation concerns.

### FR-OPS-005 Database Tooling

The backend shall provide scripts to create the database, generate migrations,
apply migrations, seed data, and open Drizzle Studio.

### FR-OPS-006 Mail Testing

The backend shall provide a script for sending a test email to a recipient.

### FR-OPS-007 Production Docker Build

The repository shall provide a multi-stage Dockerfile that builds shared
contracts, frontend assets, backend output, copies frontend assets into the
backend public directory, and starts the backend in a production image.

### FR-OPS-008 Static Asset Serving

The backend shall be able to serve static frontend assets when configured for
production packaging.

## 13. API Playground Capabilities

### FR-APG-001 Route Documentation Loading

The API playground shall load backend route documentation from the serialized API
documentation endpoint.

### FR-APG-002 Route Browsing

The API playground shall display HTTP and WebSocket routes in a searchable,
nested navigation interface with route details.

### FR-APG-003 HTTP Endpoint Testing

The API playground shall allow users to test HTTP routes with method, URL,
headers, body payloads, response display, response timing, and repeated-request
statistics.

### FR-APG-004 WebSocket Endpoint Testing

The API playground shall allow users to configure and test WebSocket endpoints
from the documentation UI.

### FR-APG-005 Documentation Detail

The API playground shall display route descriptions, URL parameters, validation
schemas, response shapes, rate limits, and middleware metadata.

### FR-APG-006 Theme and Settings

The API playground shall support light/dark theme behavior and API testing
settings.

## 14. Testing and Quality Capabilities

### FR-QA-001 Type Checking

The workspace shall provide TypeScript type checking across packages.

### FR-QA-002 Linting

The workspace shall provide ESLint-based linting across the repository.

### FR-QA-003 Unit and Service Tests

The backend and frontend shall provide package-level test commands. The shared
package shall run tests after building its TypeScript output.

### FR-QA-004 Frontend End-to-End Tests

The frontend shall provide Playwright end-to-end test support.

### FR-QA-005 Build Verification

The workspace shall build all packages recursively and include the frontend
service-worker build in the frontend production build.

## 15. Traceability

The requirements above were derived from the current repository structure and
source files:

- Root workspace scripts and setup: `package.json`, `README.md`, `init.sh`.
- Feature coordination workflow: `AGENTS.md`, `feature_list.json`,
  `progress.md`, `session-handoff.md`.
- Frontend routes and views: `packages/frontend/src/router/index.ts`,
  `packages/frontend/src/views`, `packages/frontend/src/components`,
  `packages/frontend/src/stores`, `packages/frontend/src/utils`.
- Backend HTTP routes: `packages/backend/src/app/routes/http-routes.ts`.
- Backend WebSocket routes: `packages/backend/src/app/routes/ws-routes.ts`.
- Backend services: `packages/backend/src/app/services`.
- Database schema: `packages/backend/src/database/schema.ts`.
- Shared contracts: `packages/shared/src`.
- API playground: `packages/api-playground/src`,
  `packages/api-playground/README.md`.
- Deployment and operations: `Dockerfile`,
  `packages/backend/.env.example`, package-level `package.json` files.

## 16. Known Extension Points

Downstream products are expected to customize or extend:

- domain-specific entities and workflows
- final product navigation and content
- authorization policies beyond the starter user/admin model
- production notification providers
- real SMS providers beyond local/test behavior
- support knowledge base content
- AI prompt defaults and provider selection
- deployment manifests and environment-specific infrastructure
