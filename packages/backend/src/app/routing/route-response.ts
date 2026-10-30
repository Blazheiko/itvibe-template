import type { Payload } from '#vendor/types/types.js'

/**
 * Handler result for a route's ResponseSchema:
 *  - exact `Type` → the schema's input (`inferIn`), the value feat-044 passes to `schema(payload)`;
 *  - undefined or `Type | undefined` → any Payload, as without a schema.
 *
 * `[TRes]` keeps the check non-distributive, so `Type | undefined` gives `Payload` rather than
 * `T | Payload`, which would look like a check without being one.
 *
 * A schema whose input is not a Payload (e.g. a top-level array) cannot be serialized, so it
 * gives `never`: no handler result satisfies it, unlike a structural marker a handler could build.
 */
export type RouteResponse<TRes> = [TRes] extends [{ inferIn: infer TIn }]
    ? [TIn] extends [Payload]
        ? TIn
        : never
    : Payload
