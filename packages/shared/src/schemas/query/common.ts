import { type } from "@arktype/type";
import type { SharedQuerySchema } from "./types.js";
import type { DateString, PositiveIntInput } from "./types.js";

const positiveIntFromString = type("string.integer.parse").pipe(
  type("number > 0"),
);

const limitIntFromString = type("string.integer.parse").pipe(
  type("0 < number <= 200"),
);

const dateFromString = type("string.date.parse");

export const PositiveIntFromString = positiveIntFromString;
export const LimitIntFromString = limitIntFromString;
export const DateFromString = dateFromString;

// ArkType 2.2.0 still requires a tuple-default cast workaround here.
// It is intentionally kept as an internal implementation detail, but it is
// not considered solved: some parse/default query outputs still depend on
// cast-driven compatibility types to keep emitted typings usable.
export const PaginationFields = {
  page: [positiveIntFromString, "=", "1"] as unknown as "string.integer.parse",
  limit: [limitIntFromString, "=", "50"] as unknown as "string.integer.parse",
} as const;

export const DateRangeFields = {
  "dateFrom?": dateFromString,
  "dateTo?": dateFromString,
} as const;

export const CursorFields = {
  "cursor?": "string",
  limit: [limitIntFromString, "=", "50"] as unknown as "string.integer.parse",
} as const;

interface PaginationQueryOutput {
  page: number;
  limit: number;
}

export interface PaginationQueryInput {
  page?: PositiveIntInput;
  limit?: PositiveIntInput;
}

interface DateRangeQueryOutput {
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DateRangeQueryInput {
  dateFrom?: DateString;
  dateTo?: DateString;
}

interface CursorQueryOutput {
  cursor?: string;
  limit: number;
}

export interface CursorQueryInput {
  cursor?: string;
  limit?: PositiveIntInput;
}

// These base schemas remain exported for direct validation and regression
// coverage. We intentionally do not compose feature-level query contracts from
// them with `.and()`, because ArkType 2.2.0 still breaks ergonomic typing for
// the resulting shared API on morph/default query schemas.
export const PaginationQuerySchema = type({
  ...PaginationFields,
}) as unknown as SharedQuerySchema<PaginationQueryOutput>;

export type PaginationQuery = typeof PaginationQuerySchema.infer;

export const DateRangeQuerySchema = type({
  ...DateRangeFields,
}) as unknown as SharedQuerySchema<DateRangeQueryOutput>;

export type DateRangeQuery = typeof DateRangeQuerySchema.infer;

export const CursorQuerySchema = type({
  ...CursorFields,
}) as unknown as SharedQuerySchema<CursorQueryOutput>;

export type CursorQuery = typeof CursorQuerySchema.infer;
