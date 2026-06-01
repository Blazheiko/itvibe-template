# frontend

The `frontend` package is the Vue 3 + Vite single-page application of the
`itvibe-template` monorepo. It talks to the [`backend`](../backend) over HTTP and
WebSocket and shares request/response contracts via the [`shared`](../shared)
workspace package.

> Run it from the repository root (`pnpm dev` / `pnpm dev:frontend`). See the
> [root README](../../README.md) for workspace-wide setup, ports, and `.env`.

## Tech stack

- **Vue 3** (Composition API, `<script setup>`) + **TypeScript**
- **Vite** build, with a separate service-worker build (`vite.sw.config.ts`)
- **Pinia** for state management
- **Vue Router** with auth / admin navigation guards
- **vue-i18n** for localization
- **Sentry** (`@sentry/vue`) for error/performance monitoring
- **PWA**: service worker, install prompt, update notifications
- **Playwright** (e2e) and **Vitest** (unit) for testing

## Features

- **Authentication** — login / register (modal-based), email verification, and
  password reset flows (`Login.vue`, `VerifyEmailView.vue`, `ResetPasswordView.vue`)
- **User account** — account settings and avatar editing with image cropping
  (`UserAccount.vue`, `AvatarEditorModal.vue`)
- **News / notes** — list, detail, and create views (`News.vue`,
  `NewsDetail.vue`, `CreateNews.vue`)
- **Support** — support page backed by a knowledge base (`SupportView.vue`)
- **Admin panel** — knowledge base, users, online users, and online history,
  gated by an admin route guard (`views/admin/*`)
- **Policy pages** — privacy, terms, cookies, and AI/content policy
- **Real-time** — WebSocket connection with a live connection-status indicator
- **Internationalization** — 18 locales under `src/locales`
- **PWA** — installable app with offline-capable service worker and in-app
  update notifications
- **Theming & responsive layout** — light/dark themes, mobile-friendly UI

## Project layout

```
src/
├── components/      # UI components (header, modals, toasts, admin, icons, …)
├── composables/     # useWebSocketConnection, useSessionLifecycle, useLocale, useSentry, useToast, …
├── locales/         # vue-i18n message files (en, ru, de, fr, … 18 total)
├── plugins/         # i18n setup
├── router/          # routes + auth/admin navigation guards
├── stores/          # Pinia stores (user, state, support, toast, …)
├── utils/           # api/base-api, csrf-token, websocket-base, sentry-*, pwa-install, …
├── views/           # routed pages (auth, account, news, support, admin, policies)
├── App.vue          # root component
├── main.ts          # app bootstrap (Pinia, router, i18n, Sentry, PWA)
└── service-worker.ts
e2e/                 # Playwright tests
public/              # static assets, manifest, icons
```

## Scripts

Run from the repository root with `pnpm --filter frontend <script>`, or from
this package directory:

| Script            | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `pnpm dev`        | Start the Vite dev server (default http://localhost:5173) |
| `pnpm build`      | Type-check, build the app, then build the service worker  |
| `pnpm preview`    | Preview the production build locally                      |
| `pnpm test:unit`  | Run Vitest unit tests                                     |
| `pnpm test:e2e`   | Run Playwright end-to-end tests                           |
| `pnpm type-check` | Type-check with `vue-tsc`                                 |
| `pnpm lint`       | Lint and auto-fix with ESLint                             |
| `pnpm format`     | Format `src/` with Prettier                               |

## Configuration

Copy `.env.example` to `.env` and set the `VITE_*` variables as needed:

- `VITE_BASE_URL` — base URL the app is served from
- `VITE_SENTRY_DSN` / `VITE_SENTRY_ENABLED` — enable frontend Sentry (disabled
  unless a DSN is set and `VITE_SENTRY_ENABLED` is not `false`)
- `VITE_SENTRY_ENVIRONMENT` / `VITE_SENTRY_RELEASE` — environment and release
  tags; keep `VITE_SENTRY_RELEASE` aligned with the backend `SENTRY_RELEASE`
  for deploy correlation
- `VITE_SENTRY_TRACES_SAMPLE_RATE` /
  `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` /
  `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` — sampling rates

## Error monitoring

- `src/utils/sentry-service.ts` is the only module that should import the Sentry
  SDK directly.
- Components and composables should report through `useSentry()` rather than
  importing Sentry directly.

## Toolchain notes

- TypeScript is pinned to `6.0.3` and should stay aligned with the workspace
  root. Run `pnpm --filter frontend type-check` (or `pnpm typecheck` from the
  root) before merging dependency changes.
- The production `build` script also builds the service worker via
  `vite.sw.config.ts`; don't skip it when verifying PWA behavior.
