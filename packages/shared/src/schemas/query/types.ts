import type { Type } from "@arktype/type";

export type SharedQuerySchema<TOutput> = Type<TOutput>;

// Frontend-facing query input types stay explicit because ArkType 2.2.0
// does not provide ergonomic `inferIn` types for parse/default query schemas.
// Output-side for some parse/default schemas still relies on a temporary
// cast-driven compatibility layer; do not treat those `typeof Schema.infer`
// exports as fully schema-derived until the tuple-default workaround is gone.
export type DateString = string;
export type PositiveIntInput = string | number;
