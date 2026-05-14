import { type } from "@arktype/type";
import {
  PaginationFields,
  DateRangeFields,
} from "./common.js";
import type { DateRangeQueryInput, PaginationQueryInput } from "./common.js";
import type { SharedQuerySchema } from "./types.js";

export type LlmTextUsageFeature =
  | "TRANSLATOR_TRANSLATE"
  | "TRANSLATOR_SUMMARY"
  | "TEACHER_CHAT"
  | "TEACHER_LESSON"
  | "TEACHER_FACTS"
  | "TEACHER_VOCABULARY"
  | "PROMPT_TEST";

export type LlmImageUsageFeature = "AVATAR_GENERATE" | "CHAT_IMAGE_EDIT";

export type InworldUsageFeature = "TEACHER_CHAT";

export type GrokUsageFeature =
  | "TEACHER_CHAT"
  | "TEACHER_VOCABULARY"
  | "TEACHER_SYNTAX"
  | "TRANSLATOR_TRANSLATE";

export type LlmAudioUsageFeature = "TEACHER_STT" | "TRANSLATOR_STT";

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
  "feature?":
    "'TRANSLATOR_TRANSLATE' | 'TRANSLATOR_SUMMARY' | 'TEACHER_CHAT' | 'TEACHER_LESSON' | 'TEACHER_FACTS' | 'TEACHER_VOCABULARY' | 'PROMPT_TEST'",
}) as unknown as SharedQuerySchema<LlmTextUsageQueryOutput>;

export type LlmTextUsageQuery = typeof LlmTextUsageQuerySchema.infer;

type LlmImageUsageQueryOutput = BaseUsageQuery<LlmImageUsageFeature>;
export type LlmImageUsageQueryInput =
  BaseUsageQueryInput<LlmImageUsageFeature>;

export const LlmImageUsageQuerySchema = type({
  ...PaginationFields,
  ...DateRangeFields,
  "userId?": "string",
  "feature?": "'AVATAR_GENERATE' | 'CHAT_IMAGE_EDIT'",
}) as unknown as SharedQuerySchema<LlmImageUsageQueryOutput>;

export type LlmImageUsageQuery = typeof LlmImageUsageQuerySchema.infer;

type InworldUsageQueryOutput = BaseUsageQuery<InworldUsageFeature>;
export type InworldUsageQueryInput =
  BaseUsageQueryInput<InworldUsageFeature>;

export const InworldUsageQuerySchema = type({
  ...PaginationFields,
  ...DateRangeFields,
  "userId?": "string",
  "feature?": "'TEACHER_CHAT'",
}) as unknown as SharedQuerySchema<InworldUsageQueryOutput>;

export type InworldUsageQuery = typeof InworldUsageQuerySchema.infer;

type GrokUsageQueryOutput = BaseUsageQuery<GrokUsageFeature>;
export type GrokUsageQueryInput = BaseUsageQueryInput<GrokUsageFeature>;

export const GrokUsageQuerySchema = type({
  ...PaginationFields,
  ...DateRangeFields,
  "userId?": "string",
  "feature?":
    "'TEACHER_CHAT' | 'TEACHER_VOCABULARY' | 'TEACHER_SYNTAX' | 'TRANSLATOR_TRANSLATE'",
}) as unknown as SharedQuerySchema<GrokUsageQueryOutput>;

export type GrokUsageQuery = typeof GrokUsageQuerySchema.infer;

type LlmAudioUsageQueryOutput = BaseUsageQuery<LlmAudioUsageFeature>;
export type LlmAudioUsageQueryInput =
  BaseUsageQueryInput<LlmAudioUsageFeature>;

export const LlmAudioUsageQuerySchema = type({
  ...PaginationFields,
  ...DateRangeFields,
  "userId?": "string",
  "feature?": "'TEACHER_STT' | 'TRANSLATOR_STT'",
}) as unknown as SharedQuerySchema<LlmAudioUsageQueryOutput>;

export type LlmAudioUsageQuery = typeof LlmAudioUsageQuerySchema.infer;
