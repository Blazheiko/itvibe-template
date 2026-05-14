export { arkValidator as defaultValidator, arkValidator } from "./adapters/arktype-adapter.js";

import type { Type } from "@arktype/type";

/**
 * Infers the controller-side type of `httpData.query` from a route's
 * `queryValidator` schema:
 *  - If a schema is provided, returns the schema's output type.
 *  - If `undefined` is passed, returns `null` — matching the runtime
 *    contract that `httpData.query === null` when no validator is set.
 *
 * Use this to annotate handler signatures when the handler is declared
 * separately from `defineRoute(...)` (e.g., as a controller method).
 *
 * @example
 *   const list: HttpHandler<never, InferQuery<typeof MyQuerySchema>> = ...;
 */
export type InferQuery<S extends Type | undefined> =
  S extends Type<infer Q> ? Q : null;
