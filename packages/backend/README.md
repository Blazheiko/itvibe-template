# backend

High-performance HTTP/WebSocket server on uWebSockets.js with Drizzle ORM and schema-based validation via ArkType adapters.

## Quick Start

```bash
# from monorepo root
pnpm install
pnpm build:shared
pnpm dev:backend

# or from this package
pnpm dev
```

## Configuration

Configuration is split across modules in `src/config/` (`app.ts`, `database.ts`, `redis.ts`, `disk.ts`, `cookies.ts`, `cors.ts`, `csp.ts`, `mail.ts`, `oauth.ts`, `push.ts`, `session.ts`, `ai.ts`, `support.ts`, `translator.ts`, `turn.ts`).

### Error Monitoring

Backend Sentry integration is intentionally behind a single service abstraction: `#app/services/sentry-service`.

- Do not import `@sentry/node` directly outside the service module.
- Only `logger.error` and `logger.fatal` are forwarded to Sentry from the Pino transport.
- `logger.warn` and `logger.info` remain local and are not reported.
- Unexpected HTTP / WS handler exceptions should be captured with request context when available (`requestId`, `route`, `method`, `userId`).

Relevant environment variables:

- `SENTRY_DSN` — enables backend Sentry when set
- `SENTRY_ENABLED` — hard kill switch for backend Sentry
- `SENTRY_ENVIRONMENT` — Sentry environment tag, defaults to `APP_ENV`
- `SENTRY_RELEASE` — Sentry release tag, typically the commit SHA
- `SENTRY_TRACES_SAMPLE_RATE` — performance trace sample rate, `0` disables tracing

Rollout plan:

1. Keep `SENTRY_ENABLED=false` in all environments until the change is deployed.
2. Enable Sentry in staging first and watch event volume / noise for at least 48 hours.
3. Promote to production only after staging is stable.
4. Keep Telegram alerts on during the initial rollout so Sentry can be compared against the existing path.

## Tech Stack

- uWebSockets.js — HTTP + WebSocket server
- Drizzle ORM + PostgreSQL (pg pool)
- ioredis — session storage, pub/sub, presence
- ArkType — schema engine behind route validation
- Pino — structured logging
- Vitest — testing
- MinIO / S3 — file storage
- Nodemailer — transactional email
- Arctic — OAuth (Google, GitHub, ...)
- web-push — Web Push notifications
- AI SDKs — OpenAI, xAI (Grok), Mistral, Inworld

## Architecture

### Request Flow

End-to-end pipeline of a single HTTP request, with the module that owns each step:

```
                    ┌─────────────────────────┐
                    │         Client          │
                    └────────────┬────────────┘
                                 │ HTTP request
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  uWebSockets.js  —  src/vendor/start/server.ts                   │
│  • TLS / HTTP parsing                                            │
│  • dispatches to the matched route                               │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Router  —  src/vendor/utils/routing/                            │
│  • match prefix + url + method                                   │
│  • extract :params  →  RouteItem                                 │
│  • routes registered from src/app/routes/http-routes.ts          │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  collectRequestMetadata  (server.ts)                             │
│  • parse cookies, query, headers, IP synchronously               │
│  • uWS `req` is invalid after the first await — snapshot now     │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Rate limit  —  src/vendor/utils/network/rate-limit.ts           │
│  per-IP × per-route sliding window                               │
│  exceeded? ──►  429  +  Retry-After  +  X-RateLimit-* headers    │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Content-Type & body-size guards                                 │
│  • Content-Type ∉ allowedContentTypes  ──►  415                  │
│  • Content-Length > APP_MAX_*_BODY_SIZE ──►  413                 │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  readAndParseBody  (server.ts)                                   │
│  • read body up to the per-kind limit                            │
│  • parse JSON / multipart / urlencoded / text / octet            │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Route validator  (route.validator)                              │
│  validator set?  ──►  validate or  ValidationError → 400         │
│  validator NOT set?  ──►  httpData.payload = null  (body dropped)│
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  HttpContext built  —  src/vendor/types/types.ts                 │
│  { requestId, logger, httpData, responseData, session, auth }    │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Middleware chain  —  src/app/middlewares/kernel.ts              │
│  group middlewares + route middlewares, executed in order        │
│  e.g.  session_web  →  auth_guard  →  partner_guard              │
│  any middleware that does NOT call next() short-circuits         │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Controller  —  src/app/controllers/http/                        │
│  transport only: read payload/params/files, map errors to status │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Service  —  src/app/services/                                   │
│  business logic; returns AppResult<T> (better-result + AppError) │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Repository  —  src/app/repositories/                            │
│  Drizzle queries against PostgreSQL (pg.Pool)                    │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Transformer  —  src/app/transformers/                           │
│  DB row → API payload  (bigint→string, ISO dates, hide secrets)  │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Controller returns response object                              │
│  ↓                                                               │
│  sendResponse  (server.ts)                                       │
│  status + headers + cookies + JSON body  ──►  res.end()          │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
                    ┌─────────────────────────┐
                    │         Client          │
                    └─────────────────────────┘
```

Side-channels:

- **Session / auth** — `context.session` (Redis via `#database/redis.js`) and `context.auth` are populated by `session_web` / `session_api` middleware before `auth_guard` runs.
- **Logging** — every step logs through `context.logger` (Pino, scoped by `requestId`).
- **WebSocket** — same shape, but the chain replaces "readAndParseBody" with `ws-api-dispatcher.ts` and "Controller" with handlers in `src/app/controllers/ws/`. Connection-level state lives in `src/app/websocket/{ws-session-auth, ws-connection-registry, ws-coordinator}.ts`.

### Layer Responsibilities

| Layer           | Purpose         | Rules                                                           |
| --------------- | --------------- | --------------------------------------------------------------- |
| **Controller**  | Transport only  | Parse payload, read auth/params/files, map errors to HTTP codes |
| **Service**     | Business logic  | Orchestrate repos, call transformers, return `AppResult<T>`     |
| **Repository**  | DB boundary     | Only Drizzle queries, no HTTP/session logic                     |
| **Transformer** | Output contract | Convert DB rows to API payloads, handle date serialization      |

## Project Structure

```
src/
├── index.ts
├── app/
│   ├── controllers/
│   │   ├── http/            # HTTP request handlers
│   │   └── ws/              # WebSocket event handlers
│   ├── services/
│   │   ├── shared/          # AppError/AppResult and shared helpers
│   │   ├── actions/         # cross-service orchestration actions
│   │   ├── ai/              # AI provider adapters
│   │   └── statistics/
│   ├── repositories/        # Drizzle data access objects
│   ├── transformers/        # DB row → API payload
│   ├── routes/
│   │   ├── http-routes.ts
│   │   └── ws-routes.ts
│   ├── middlewares/
│   │   └── kernel.ts        # middleware name → function mapping
│   ├── validate/
│   │   ├── schemas/         # ArkType schemas (legacy + local)
│   │   ├── checkers/        # custom payload checkers
│   │   └── errors/          # validation error helpers
│   ├── websocket/
│   │   ├── ws-connection-registry.ts
│   │   ├── ws-coordinator.ts   # cross-instance coordination via Redis
│   │   └── ws-session-auth.ts  # WS handshake auth
│   ├── events/
│   ├── start/
│   └── state/
├── config/                  # app.ts, database.ts, redis.ts, disk.ts, mail.ts, oauth.ts, push.ts, ai.ts, ...
├── database/
│   ├── db.ts                # pg Pool + Drizzle instance
│   ├── redis.ts             # ioredis client(s)
│   └── schema.ts            # all table definitions
├── db/
│   ├── create-database.ts   # bootstrap empty database
│   └── seed.ts              # seed script
├── drizzle/
│   └── migrations/          # generated SQL migrations
├── docs/                    # internal architecture / feature notes
├── openapi/                 # generated OpenAPI spec
├── scripts/                 # one-off utilities (backfills, mail test, ...)
└── vendor/                  # framework internals (server, router, types)
```

## Path Aliases

| Alias         | Path                      |
| ------------- | ------------------------- |
| `#app/*`      | `src/app/*`               |
| `#config/*`   | `src/config/*`            |
| `#vendor/*`   | `src/vendor/*`            |
| `#database/*` | `src/database/*`          |
| `#drizzle/*`  | `src/drizzle/*`           |
| `#logger`     | `src/vendor/utils/logger` |

```ts
import { db } from "#database/db.js";
import logger from "#logger";
import { defineRoute } from "#app/routing/define-route.js";
```

---

## HTTP Routes

Routes are defined in `src/app/routes/http-routes.ts` as an array of groups.

Each group has:

- `prefix` — URL prefix for all routes in the group
- `middlewares` — string keys from `kernel.ts`, applied to every route in the group
- `rateLimit` — optional window/maxRequests applied to the group
- `description` — shown in API docs
- `group` — array of `defineRoute(...)` calls

Individual routes can also declare their own `middlewares`, `rateLimit`, and `allowedContentTypes` that stack on top of the group's.

### Route fields

| Field                 | Type         | Default     | Description                                                                                                  |
| --------------------- | ------------ | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `url`                 | `string`     | —           | URL path (`:param` for path params)                                                                          |
| `method`              | `string`     | —           | `get`, `post`, `put`, `patch`, `delete`, `ws`                                                                |
| `handler`             | `Function`   | —           | Controller method                                                                                            |
| `validator`           | `ArkType`    | `undefined` | ArkType schema for request body; payload is validated before the handler                                     |
| `queryValidator`      | `ArkType`    | `undefined` | ArkType schema for query params; query is validated before the handler and exposed as typed `httpData.query` |
| `queryAllowExtra`     | `boolean`    | `false`     | Allows undeclared query keys and strips them from the validated object instead of rejecting the request      |
| `queryArrays`         | `string[]`   | `[]`        | Declares query keys that may appear multiple times and should be collected as arrays                         |
| `allowedContentTypes` | `BodyKind[]` | `['json']`  | Allowed request body content-type kinds for POST/PUT. Non-matching requests are rejected with **415**.       |
| `middlewares`         | `string[]`   | `[]`        | Middleware keys from `kernel.ts`, stacked on top of group middlewares                                        |
| `rateLimit`           | `RateLimit`  | `undefined` | Per-route rate limit                                                                                         |
| `description`         | `string`     | `undefined` | Shown in API docs                                                                                            |
| `ResponseSchema`      | `ArkType`    | `undefined` | Response schema for docs                                                                                     |

`BodyKind` values: `'json'` · `'multipart'` · `'urlencoded'` · `'text'` · `'octet'`

```ts
// src/app/routes/http-routes.ts
import AuthController from "#app/controllers/http/auth-controller.js";
import AvatarController from "#app/controllers/http/avatar-controller.js";
import { defineRoute } from "#app/routing/define-route.js";
import { RegisterInputSchema, LoginInputSchema } from "shared/schemas";
import * as ResponseSchemas from "shared/responses";

export default [
  {
    prefix: "auth",
    description: "Auth routes",
    middlewares: ["session_web"], // applied to every route in the group
    rateLimit: {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 10,
    },
    group: [
      defineRoute({
        url: "/register",
        method: "post",
        handler: AuthController.register.bind(AuthController),
        validator: RegisterInputSchema, // ArkType schema from shared/schemas
        // allowedContentTypes defaults to ['json'] — no need to specify
        ResponseSchema: ResponseSchemas.RegisterResponseSchema,
        description: "Register a new user",
      }),
      defineRoute({
        url: "/login",
        method: "post",
        handler: AuthController.login.bind(AuthController),
        validator: LoginInputSchema,
        ResponseSchema: ResponseSchemas.LoginResponseSchema,
        description: "Login a user",
      }),
      defineRoute({
        url: "/logout",
        method: "post",
        handler: AuthController.logout.bind(AuthController),
        ResponseSchema: ResponseSchemas.LogoutResponseSchema,
        description: "Logout a user",
        middlewares: ["auth_guard"], // extra middleware on top of group's
      }),
    ],
  },
  {
    prefix: "avatar",
    middlewares: ["session_web", "auth_guard"],
    group: [
      defineRoute({
        url: "/upload",
        method: "post",
        handler: AvatarController.uploadAvatar.bind(AvatarController),
        allowedContentTypes: ["multipart"], // must be explicit for file uploads
        ResponseSchema: ResponseSchemas.UploadAvatarResponseSchema,
        description: "Upload user avatar",
      }),
    ],
  },
];
```

### Body Size Limits

Limits are applied per content-type kind before the body is read. Override via environment variables:

| Env variable                  | Default            | Applies to                                               |
| ----------------------------- | ------------------ | -------------------------------------------------------- |
| `APP_MAX_JSON_BODY_SIZE`      | 2 097 152 (2 MB)   | `application/json`                                       |
| `APP_MAX_MULTIPART_BODY_SIZE` | 52 428 800 (50 MB) | `multipart/form-data`                                    |
| `APP_MAX_OCTET_BODY_SIZE`     | 52 428 800 (50 MB) | `application/octet-stream`                               |
| `APP_MAX_BODY_SIZE`           | 2 097 152 (2 MB)   | `application/x-www-form-urlencoded`, `text/plain`, other |

Requests that exceed the limit receive **413 Payload Too Large**. Requests with an unexpected `Content-Type` (not in `allowedContentTypes`) receive **415 Unsupported Media Type**.

### Rate Limiting

Rate limits are declared per-group or per-route via the `rateLimit: { windowMs, maxRequests }` field. Checks are performed before the body is read — rejected requests never consume the `APP_MAX_*_BODY_SIZE` buffer.

The counter is **per-process, in-memory** (sliding window). If you run multiple Node instances behind a load balancer, each holds its own counter — the effective limit is `maxRequests × N_instances`.

Every response (to a route that has a rate limit configured) carries these headers:

| Header                  | Format                               | Description                                                               |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `X-RateLimit-Limit`     | integer                              | Maximum requests allowed in the current window (`maxRequests`)            |
| `X-RateLimit-Remaining` | integer                              | Requests remaining in the current window                                  |
| `X-RateLimit-Reset`     | **absolute Unix timestamp, seconds** | Point in time at which the oldest tracked request falls out of the window |
| `Retry-After`           | integer (seconds)                    | Only on **429** responses — seconds until the client may retry            |

`X-RateLimit-Reset` is an absolute Unix timestamp (`seconds since epoch`), **not** a relative delta. Clients should compute `wait = max(0, reset - nowSeconds())`. This matches the GitHub convention — it does not follow RFC 9331 (`RateLimit-*` headers without the `X-` prefix).

When the limit is exceeded the server responds **429 Too Many Requests**:

```json
{
  "message": "Too many requests, please try again later.",
  "retryAfter": 37
}
```

### Nested Groups

Groups can be nested to compose middleware/prefix chains:

```ts
{
  prefix: 'main',
  middlewares: ['session_web'],
  group: [
    defineRoute({ url: '/init', method: 'get', handler: MainController.init, middlewares: ['auth_guard'] }),

    // nested group — prefix becomes "main/admin", both session_web and auth_guard apply
    {
      prefix: 'admin',
      middlewares: ['auth_guard'],
      group: [
        defineRoute({ url: '/stats', method: 'get', handler: AdminController.stats }),
      ],
    },
  ],
}
```

---

## WebSocket Routes

Defined in `src/app/routes/ws-routes.ts`. Same structure as HTTP routes but use `defineWsRoute`.

```ts
// src/app/routes/ws-routes.ts
import WSApiController from "#app/controllers/ws/ws-api-controller.js";
import { defineWsRoute } from "#app/routing/define-ws-route.js";
import { WSEventTypingPayloadSchema } from "shared/schemas";
import * as ResponseSchemas from "shared/responses";

export default [
  {
    prefix: "main",
    description: "Main WS routes",
    rateLimit: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 600,
    },
    group: [
      defineWsRoute({
        url: "event_typing",
        handler: WSApiController.eventTyping.bind(WSApiController),
        validator: WSEventTypingPayloadSchema,
        ResponseSchema: ResponseSchemas.EventTypingResponseSchema,
        description: "Handle typing events",
        rateLimit: {
          windowMs: 1 * 60 * 1000,
          maxRequests: 30,
        },
      }),
      defineWsRoute({
        url: "read_message",
        handler: WSApiController.readMessage.bind(WSApiController),
        validator: ReadMessagesInputSchema,
        ResponseSchema: ResponseSchemas.ReadMessageResponseSchema,
        description: "Handle read message events",
      }),
    ],
  },
];
```

---

## Middleware

Middleware lives in `src/app/middlewares/` and is registered by string key in `src/app/middlewares/kernel.ts`.

### kernel.ts — middleware registry

```ts
// src/app/middlewares/kernel.ts
import sessionWeb from "#vendor/utils/middlewares/ws/session-web.js";
import sessionAPI from "#vendor/utils/middlewares/http/session-api.js";
import authGuard from "#vendor/utils/middlewares/core/auth-guard.js";
import adminGuard from "#app/middlewares/admin-guard.js";
import partnerGuard from "#app/middlewares/partner-guard.js";

const middlewares: Record<string, Function> = {
  session_web: sessionWeb,
  session_api: sessionAPI,
  auth_guard: authGuard,
  admin_guard: adminGuard,
  partner_guard: partnerGuard,
};

export default middlewares;
```

### Middleware signature

A middleware receives `(context, next)`. Call `next()` to continue. **Do not call `next()`** to abort the chain and short-circuit the response.

```ts
// src/app/middlewares/admin-guard.ts
import type { HttpContext, Middleware } from "#vendor/types/types.js";
import { userRepository } from "#app/repositories/index.js";

const adminGuard: Middleware = async (
  context: HttpContext,
  next: () => Promise<void>,
): Promise<void> => {
  const userId = context.auth.getUserId();
  if (userId === null) {
    context.responseData.status = 403;
    context.responseData.payload = {
      status: "forbidden",
      message: "Admin access required",
    };
    return; // ← abort, handler is never called
  }

  const user = await userRepository.findById(BigInt(userId));
  if (user?.role !== "admin") {
    context.responseData.status = 403;
    context.responseData.payload = {
      status: "forbidden",
      message: "Admin access required",
    };
    return;
  }

  await next(); // ← continue to the next middleware / handler
};

export default adminGuard;
```

### Built-in middleware

| Key             | Description                                        |
| --------------- | -------------------------------------------------- |
| `session_web`   | Loads/creates a Redis session from cookie          |
| `session_api`   | Loads session from `Authorization` header token    |
| `auth_guard`    | Aborts with 401 if `context.auth.check()` is false |
| `admin_guard`   | Aborts with 403 if user's `role` is not `admin`    |
| `partner_guard` | Aborts with 403 if user is not a partner account   |

---

## Validation (ArkType)

Schemas are defined in the `shared` package and imported in routes.
ArkType is used only as the project schema engine; route registration goes through the backend wrapper layer, not through direct adapter calls in route files.

```ts
// shared/schemas (example, defined in packages/shared)
import { type } from "arktype";

export const CreateNoteInputSchema = type({
  title: "string",
  "description?": "string",
});

export type CreateNoteInput = typeof CreateNoteInputSchema.infer;
```

### Using in a route

```ts
defineRoute({
  url: "/",
  method: "post",
  validator: CreateNoteInputSchema, // schema passed directly to defineRoute
  handler: NotesController.createNote.bind(NotesController),
});
```

Do not wrap route validators manually with `arkValidator(...)` in route files. `defineRoute` / `defineWsRoute` normalize the schema through the active validation wrapper internally.

### Validation rules

- This backend uses one schema engine across the project: ArkType.
- Route files pass the raw schema object as `validator: SomeSchema`; `defineRoute` / `defineWsRoute` apply the active wrapper internally.
- Do not introduce a second schema engine per-route (`Zod`, `Valibot`, `Yup`, etc.). If the project ever migrates, that is a global refactor, not a local experiment.
- If a rare transport edge case needs a custom validator, treat it as an exception and keep it behind the same validator contract instead of mixing route-level schema engines.

### Reading validated payload in a handler

`getTypedPayload` extracts the already-validated, fully-typed payload from context.
The generic `TPayload` on `HttpContext<TPayload>` is inferred automatically from `validator` by `defineRoute`.

```ts
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js'
import type { CreateNoteInput } from 'shared/schemas'

async createNote(context: HttpContext<CreateNoteInput>) {
  const payload = getTypedPayload(context)
  // payload is typed as CreateNoteInput — no casting needed
}
```

### Routes without a validator

If a route does **not** declare `validator`, the framework discards any incoming body and the controller receives `httpData.payload = null` — even on POST/PUT with a JSON body. The raw body is **not** forwarded to the handler.

```ts
defineRoute({
  url: '/ping',
  method: 'post',
  handler: PingController.ping.bind(PingController),
  // no validator
})

// in the controller:
async ping(context: HttpContext) {
  context.httpData.payload // → null, regardless of what the client sent
}
```

Implications:

- Use a `validator` for any route that needs to read the request body. Without it, the body is unreachable from the handler.
- `getTypedPayload(context)` will throw `Error("Payload is missing")` — this is intentional: it surfaces the missing validator immediately rather than silently passing empty data to the handler.
- Handlers on validator-less routes (e.g. `logout`, `ping`) must not call `getTypedPayload` — they have nothing to read.
- The TypeScript generic on `HttpContext<TPayload>` does **not** reflect runtime nullness, so don't trust typed fields on a route that has no validator.

---

## Controller

Controllers live in `src/app/controllers/http/` (HTTP) and `src/app/controllers/ws/` (WS).

- Plain objects (not classes) with async handler methods
- Transport-only: parse payload, read auth/params/files, map service errors to HTTP status codes
- No business logic, no raw SQL

```ts
// src/app/controllers/http/auth-controller.ts
import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { authService } from "#app/services/auth-service.js";
import type {
  LoginInput,
  RegisterInput,
  ChangePasswordInput,
} from "shared/schemas";
import type {
  LoginResponse,
  RegisterResponse,
  LogoutResponse,
  ChangePasswordResponse,
} from "shared";

// helper — keeps error mapping in one place
function setServiceErrorStatus(
  context: HttpContext,
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL",
): void {
  const map = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL: 500,
  };
  context.responseData.status = map[code] ?? 500;
}

export default {
  // POST /auth/register
  async register(
    context: HttpContext<RegisterInput>,
  ): Promise<RegisterResponse> {
    const payload = getTypedPayload(context); // typed as RegisterInput
    const result = await authService.register(
      payload,
      context.auth,
      context.session,
      context.logger,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return {
      status: result.data.status,
      user: result.data.user,
      wsUrl: result.data.wsUrl,
    };
  },

  // POST /auth/login
  async login(context: HttpContext<LoginInput>): Promise<LoginResponse> {
    const payload = getTypedPayload(context);
    const result = await authService.login(
      payload,
      context.auth,
      context.session,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      if (result.code === "UNAUTHORIZED") {
        return { status: "unauthorized", message: result.message };
      }
      return { status: "error", message: result.message };
    }

    return {
      status: result.data.status,
      user: result.data.user,
      wsUrl: result.data.wsUrl,
    };
  },

  // POST /auth/logout
  async logout(context: HttpContext): Promise<LogoutResponse> {
    const result = await authService.logout(context.auth);
    return { status: result.data.status };
  },

  // POST /auth/change-password  (requires auth_guard middleware)
  async changePassword(
    context: HttpContext<ChangePasswordInput>,
  ): Promise<ChangePasswordResponse> {
    const userId = context.auth.getUserId();
    if (userId === null) {
      context.responseData.status = 401;
      return { status: "error", message: "Unauthorized" };
    }

    const payload = getTypedPayload(context);
    const result = await authService.changePassword(BigInt(userId), payload);
    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success" };
  },
};
```

### HttpContext fields

| Field                  | Type                                | Description                                                                   |
| ---------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `requestId`            | `string`                            | Unique request ID (for logging/tracing)                                       |
| `logger`               | `Logger`                            | Pino logger scoped to this request                                            |
| `httpData.payload`     | `TPayload \| null`                  | Validated request body                                                        |
| `httpData.params`      | `Record<string, string>`            | URL params (`:userId` etc.)                                                   |
| `httpData.query`       | `TQuery` or `null`                  | Validated query object when route declares `queryValidator`; otherwise `null` |
| `httpData.headers`     | `Map<string, string>`               | Request headers                                                               |
| `httpData.cookies`     | `Map<string, string>`               | Request cookies                                                               |
| `httpData.files`       | `Map<string, UploadedFile> \| null` | Multipart file uploads                                                        |
| `responseData.status`  | `number`                            | HTTP status to send (default 200)                                             |
| `responseData.payload` | `Payload \| null`                   | Override payload (set by middleware)                                          |
| `session`              | `Session`                           | Redis session management                                                      |
| `auth`                 | `Auth`                              | `auth.check()`, `auth.getUserId()`, `auth.login()`, `auth.logout()`           |

### Query validation

Query validation is handled by `defineRoute(...)` and executed in `server.ts`
before the controller runs. The request never exposes raw `URLSearchParams` to
handlers:

- if a route does not declare `queryValidator`, `httpData.query` is `null`
- if a route declares `queryValidator`, `httpData.query` contains the validated
  and typed object produced by ArkType
- invalid query values fail the request with **422 Unprocessable Entity**
- this happens before controller logic, so the handler only sees normalized data

```ts
const ListQuerySchema = type({
  page: [type("string.integer.parse").pipe(type("number > 0")), "=", "1"],
  limit: [
    type("string.integer.parse").pipe(type("0 < number <= 200")),
    "=",
    "50",
  ],
  "userId?": "string",
});

defineRoute({
  url: "/items",
  method: "get",
  queryValidator: ListQuerySchema,
  handler: ItemsController.list,
});
```

Short admin example from the current codebase:

```ts
defineRoute({
  url: "/users",
  method: "get",
  queryValidator: AdminUserListQuerySchema,
  handler: AdminUserController.list.bind(AdminUserController),
});
```

That route reads filters such as `userId`, `dateFrom`, `dateTo`, `promoCode`,
and `limit` from `context.httpData.query`, so the controller never parses the
raw query string itself.

How it works in practice:

1. The router registers `queryValidator` and related flags on the route.
2. `server.ts` reads the URL query string, flattens repeated keys only for the
   names listed in `queryArrays`, and then runs ArkType validation.
3. By default the schema is strict: undeclared keys are rejected with **422**.
4. If `queryAllowExtra: true` is set, extra keys are allowed but stripped from
   the final object before it reaches the controller.
5. Duplicate keys such as `?a=1&a=2` are rejected unless `a` is listed in
   `queryArrays` and the schema expects an array type like `string[]`.

This means the controller should always treat `context.httpData.query` as the
canonical source of truth for query params. In middleware, where the route
generic type is not always available, use `getTypedQuery<T>(ctx)` only after the
route has declared a `queryValidator`.

Example for repeated keys:

```ts
const SearchQuerySchema = type({
  "tags?": "string[]",
});

defineRoute({
  url: "/search",
  method: "get",
  queryValidator: SearchQuerySchema,
  queryArrays: ["tags"],
  handler: SearchController.search,
});
```

With that setup, `?tags=vue&tags=backend` becomes `{ tags: ["vue", "backend"] }`.
Without `queryArrays`, the same request is rejected during validation.

---

## Service

Services live in `src/app/services/`. They contain all business logic and usually return `AppResult<T>`.

```ts
// src/app/services/shared/errors.ts
export type AppError =
  | { _tag: "BadRequest"; message: string; reason?: string }
  | { _tag: "Unauthorized"; message: string }
  | { _tag: "Forbidden"; message: string; reason?: string }
  | { _tag: "NotFound"; resource: string; message: string }
  | { _tag: "Conflict"; message: string; reason?: string }
  | { _tag: "Internal"; publicMessage: string; cause?: unknown };

export type AppResult<T> = Result<T, AppError>;

export function badRequest(message: string, reason?: string): AppError;
export function unauthorized(message?: string): AppError;
export function forbidden(message: string, reason?: string): AppError;
export function notFound(resource: string, message: string): AppError;
export function conflict(message: string, reason?: string): AppError;
export function internal(
  cause: unknown,
  publicMessage?: string,
): AppError;
```

### Service example

```ts
// src/app/services/auth-service.ts (excerpt)
import { Result } from "better-result";
import { hashPassword, validatePassword } from "metautil";
import type { Auth, Session } from "#vendor/types/types.js";
import { userRepository } from "#app/repositories/index.js";
import { userTransformer } from "#app/transformers/index.js";
import {
  badRequest,
  conflict,
  unauthorized,
  type AppResult,
} from "#app/services/shared/errors.js";
import { tryInternal } from "#app/services/shared/result-helpers.js";
import { generateWsToken } from "#app/services/generate-ws-token-service.js";
import { getWsUrl } from "#app/services/get-ws-url-service.js";
import type { LoginInput, RegisterInput } from "shared/schemas";

export const authService = {
  async register(
    payload: RegisterInput,
    auth: Auth,
    session: Session,
  ): Promise<AppResult<{
    status: "success";
    user: SerializedUser;
    wsUrl: string;
    wsToken: string;
  }>> {
    const email = payload.email.toLowerCase();

    const existResult = await tryInternal(
      () => userRepository.findByEmail(email),
      "Failed to load user by email",
    );
    if (Result.isError(existResult)) return Result.err(existResult.error);
    if (existResult.value !== undefined) {
      return Result.err(conflict("Email already exists"));
    }

    const hash = await hashPassword(payload.password);
    const user = await userRepository.create({
      name: payload.name,
      email,
      password: hash,
    });

    await auth.login(String(user.id), session);
    const wsToken = await generateWsToken(user.id);

    return Result.ok({
      status: "success",
      user: userTransformer.serialize(user),
      wsUrl: getWsUrl(),
      wsToken,
    });
  },

  async login(
    payload: LoginInput,
    auth: Auth,
    session: Session,
  ): Promise<AppResult<{
    status: "success";
    user: SerializedUser;
    wsUrl: string;
    wsToken: string;
  }>> {
    const userResult = await tryInternal(
      () => userRepository.findByEmail(payload.email.toLowerCase()),
      "Failed to load user by email",
    );
    if (Result.isError(userResult)) return Result.err(userResult.error);
    const user = userResult.value;
    if (user === undefined || user.password === null) {
      return Result.err(unauthorized("Invalid email or password"));
    }

    const valid = await validatePassword(payload.password, user.password);
    if (!valid) return Result.err(unauthorized("Invalid email or password"));

    await auth.login(String(user.id), session);
    const wsToken = await generateWsToken(user.id);

    return Result.ok({
      status: "success",
      user: userTransformer.serialize(user),
      wsUrl: getWsUrl(),
      wsToken,
    });
  },

  async logout(auth: Auth): Promise<AppResult<{ status: "success" }>> {
    await auth.logout();
    return Result.ok({ status: "success" });
  },
};
```

---

## Repository

Repositories live in `src/app/repositories/`. **Only** Drizzle queries — no HTTP, no session, no formatting. They typically expose an interface plus the implementation, and are re-exported from `src/app/repositories/index.ts`.

```ts
// src/app/repositories/user-repository.ts (excerpt)
import { db } from "#database/db.js";
import { users } from "#database/schema.js";
import { eq, sql } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type UserRow = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;
export type UserUpdate = Partial<
  Pick<
    UserInsert,
    | "name"
    | "email"
    | "password"
    | "phone"
    | "avatar"
    | "role"
    | "emailVerifiedAt"
  >
>;

export interface IUserRepository {
  create(data: UserInsert): Promise<UserRow>;
  findById(id: bigint): Promise<UserRow | undefined>;
  findByEmail(email: string): Promise<UserRow | undefined>;
  update(id: bigint, data: UserUpdate): Promise<UserRow | undefined>;
  delete(id: bigint): Promise<boolean>;
}

export const userRepository: IUserRepository = {
  async create(data) {
    const now = new Date();
    const [created] = await db
      .insert(users)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning();
    if (created === undefined) throw new Error("Failed to create user");
    return created;
  },

  async findById(id) {
    return await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
      .then((r) => r.at(0));
  },

  async findByEmail(email) {
    // case-insensitive lookup — emails are stored as user typed them
    return await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`)
      .limit(1)
      .then((r) => r.at(0));
  },

  async update(id, data) {
    await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id));
    return userRepository.findById(id);
  },

  async delete(id) {
    const deleted = await db.delete(users).where(eq(users.id, id)).returning();
    return deleted.length > 0;
  },
};
```

---

## Transformer

Transformers live in `src/app/transformers/`. They convert DB rows to API-safe payloads: date stringification, field renaming, hiding internal fields.

```ts
// src/app/transformers/user-transformer.ts
import { DateTime } from "luxon";
import type { UserRow } from "#app/repositories/user-repository.js";

export type SerializedUser = Omit<
  UserRow,
  "id" | "password" | "isAdmin" | "createdAt" | "updatedAt" | "emailVerifiedAt"
> & {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
};

export const userTransformer = {
  serialize(user: UserRow): SerializedUser {
    const {
      id,
      password: _password,
      isAdmin: _isAdmin,
      createdAt,
      updatedAt,
      emailVerifiedAt,
      ...rest
    } = user;
    return {
      ...rest,
      id: String(id), // bigint → string for safe JSON
      created_at: DateTime.fromJSDate(createdAt).toISO(),
      updated_at: DateTime.fromJSDate(updatedAt).toISO(),
      emailVerified: emailVerifiedAt !== null,
      emailVerifiedAt:
        emailVerifiedAt === null
          ? null
          : DateTime.fromJSDate(emailVerifiedAt).toISO(),
    };
  },

  serializeArray(rows: UserRow[]): SerializedUser[] {
    return rows.map((u) => userTransformer.serialize(u));
  },
};
```

Notes:

- `id` is converted from `bigint` → `string` so it survives JSON serialization.
- Internal fields like `password` and `isAdmin` are stripped here, not at the controller.
- Dates are emitted in ISO 8601 via Luxon.

---

## Database

### Connection

`src/database/db.ts` creates a `pg.Pool` and passes it to Drizzle. The pool is configured for up to 10 concurrent connections. Redis clients live in `src/database/redis.ts` and are shared by sessions, the WS coordinator, and presence services.

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const pool = new pg.Pool({
  host: databaseConfig.host,
  port: databaseConfig.port,
  user: databaseConfig.user,
  password: databaseConfig.password,
  database: databaseConfig.database,
  max: 10,
});

export const db = drizzle(pool, { schema, logger: appConfig.env !== "prod" });
export { pool };
```

### Schema

All tables are defined in `src/database/schema.ts` using Drizzle's `pgTable` builder.

```ts
// src/database/schema.ts (excerpt)
import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  avatar: varchar("avatar", { length: 500 }),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const notes = pgTable("notes", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  userId: bigint("user_id", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
```

### Migrations

```bash
pnpm db:create     # create the database if it does not yet exist
pnpm db:generate   # generate SQL migration from schema changes
pnpm db:migrate    # apply pending migrations
pnpm db:studio     # open Drizzle Studio in browser
pnpm db:seed       # run seed script
```

Migrations are stored in `src/drizzle/migrations/`. Configuration is in `drizzle.config.js` — it reads `PGSQL_*` env vars.

---

## WebSocket Controller

WS handlers receive `WsContext` instead of `HttpContext`. There is no `session` or `auth` on WsContext — authentication is handled at connection time and stored in `wsData.middlewareData`.

```ts
// src/app/controllers/ws/ws-api-controller.ts
import type { WsContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { wsService } from "#app/services/ws-service.js";
import type { WSEventTypingPayload, ReadMessagesInput } from "shared/schemas";

export default {
  eventTyping(context: WsContext<WSEventTypingPayload>): EventTypingResponse {
    return wsService.eventTyping(getTypedPayload(context));
  },

  async readMessage(
    context: WsContext<ReadMessagesInput>,
  ): Promise<ReadMessageResponse> {
    return wsService.readMessage(getTypedPayload(context));
  },
};
```

---

## WebSocket Infrastructure

WS connection state is managed by three modules in `src/app/websocket/`:

| Module                      | Purpose                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `ws-session-auth.ts`        | Authenticates the WS handshake, attaches user identity to `wsData.middlewareData`         |
| `ws-connection-registry.ts` | In-process map of `userId → sockets`; used to fan messages out locally                    |
| `ws-coordinator.ts`         | Cross-instance pub/sub over Redis so multiple Node processes can deliver to the same user |

Presence and broadcast helpers live in `src/app/services/` (`ws-presence-service.ts`, `broadcast-service.ts`, `ws-service.ts`).

---

## File Uploads (S3)

Files arrive as `context.httpData.files` — a `Map<string, UploadedFile>`.

```ts
import { uploadToS3 } from "#vendor/utils/storage/s3.js";
import { badRequest } from "#app/services/shared/errors.js";
import { Result } from "better-result";

const file = context.httpData.files?.get("photo");
if (file === undefined) {
  return Result.err(badRequest("No file uploaded"));
}

const s3Key = `my-notes/${String(userId)}/${randomUUID()}${path.extname(file.filename)}`;
await uploadToS3(s3Key, Buffer.from(file.data), file.type);
```

---

## Logging

Each request has a scoped Pino logger available on `context.logger`. Use the global logger for startup/background tasks.

```ts
import logger from "#logger";

// inside a handler or service
context.logger.info("createNote handler");
context.logger.error({ err }, "Failed to create note");

// outside a request context
logger.info("Server started");
```

When Sentry is enabled, `logger.error` and `logger.fatal` are the only log levels forwarded to Sentry. Keep `warn` / `info` for local observability and routine status messages so Sentry stays focused on actionable incidents.

---

## Available Scripts

```bash
pnpm dev                            # tsx watch src/index.ts
pnpm build                          # tsc --build
pnpm start                          # node dist/index.js
pnpm clean                          # rm -rf dist .tsbuildinfo
pnpm typecheck                      # tsc --noEmit
pnpm test                           # vitest run
pnpm test:watch                     # vitest (watch mode)
pnpm db:create                      # bootstrap empty database (src/db/create-database.ts)
pnpm db:generate                    # drizzle-kit generate
pnpm db:migrate                     # drizzle-kit migrate
pnpm db:studio                      # drizzle-kit studio
pnpm db:seed                        # tsx src/db/seed.ts
pnpm db:backfill-study-audio        # one-off backfill script
pnpm db:migrate:shared-study-audio  # migrate + backfill in one shot
pnpm mail:test                      # send a test email via configured SMTP
```
