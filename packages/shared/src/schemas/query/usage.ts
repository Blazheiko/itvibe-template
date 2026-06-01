import { type } from "@arktype/type";
import {
  PaginationFields,
  DateRangeFields,
} from "./common.js";
import type { DateRangeQueryInput, PaginationQueryInput } from "./common.js";
import type { SharedQuerySchema } from "./types.js";

export type LlmTextUsageFeature =
  | "SUPPORT_CHAT"
  | "SUPPORT_QUERY_TRANSLATION"
  | "PROMPT_TEST";

export interface BaseUsageQuery<TFeature extends string> {
  page: number;
  limit: number;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  feature?: TFeature;
}

export type BaseUsageQueryInput<TFeature extends string> =
  PaginationQueryInput &
  DateRangeQueryInput & {
  userId?: string;
  feature?: TFeature;
  };

type LlmTextUsageQueryOutput = BaseUsageQuery<LlmTextUsageFeature>;
export type LlmTextUsageQueryInput =
  BaseUsageQueryInput<LlmTextUsageFeature>;

// ArkType 2.2.0 still requires inline tuple-default casts for these query
// schemas. They remain duplicated per schema after removing the public shape
// layer, because the current `.and()` / `inferIn` path does not give a usable
// shared contract for parse/default query exports.
export const LlmTextUsageQuerySchema = type({
  ...PaginationFields,
  ...DateRangeFields,
  "userId?": "string",
  "feature?": "'SUPPORT_CHAT' | 'SUPPORT_QUERY_TRANSLATION' | 'PROMPT_TEST'",
}) as unknown as SharedQuerySchema<LlmTextUsageQueryOutput>;

export type LlmTextUsageQuery = typeof LlmTextUsageQuerySchema.infer;
