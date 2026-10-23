import type { Method } from "#vendor/types/types.js";

// Methods an HTTP route (`defineRoute`) can be registered with in
// `registerHttpRoute`; `delete` is normalized to `del` by `routesHandler`.
export type HttpRouteMethod = "get" | "post" | "put" | "patch" | "delete" | "del";

// HTTP methods whose request body is read, parsed and validated.
export const BODY_METHODS = ["post", "put", "patch"] as const;
export type BodyMethod = (typeof BODY_METHODS)[number];

// HTTP methods that never read a body, so a body `validator` on them would
// silently see `payload = null`. DELETE content has no generally defined
// semantics (RFC 9110 §9.3.5): pass identifiers via `:param` or the query.
// Only these are rejected — WS routes (`ws`) validate their own payload.
export const NO_BODY_METHODS = ["get", "delete", "del"] as const;
export type NoBodyMethod = (typeof NO_BODY_METHODS)[number];

const bodyMethods: ReadonlySet<string> = new Set(BODY_METHODS);
const noBodyMethods: ReadonlySet<string> = new Set(NO_BODY_METHODS);

export const isBodyMethod = (method: Method): method is BodyMethod =>
  bodyMethods.has(method);

export const isNoBodyMethod = (method: Method): method is NoBodyMethod =>
  noBodyMethods.has(method);
