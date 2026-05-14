import { type } from "@arktype/type";
import {
  DateFromString,
  LimitIntFromString,
  PaginationFields,
} from "./common.js";
import type { DateRangeQueryInput, PaginationQueryInput } from "./common.js";
import type { PositiveIntInput, SharedQuerySchema } from "./types.js";

interface AdminUserListQueryOutput {
  userId?: string;
  limit: number;
  dateFrom?: Date;
  dateTo?: Date;
  promoCode?: string;
}

export type AdminUserListQueryInput = DateRangeQueryInput & {
  userId?: string;
  limit?: PositiveIntInput;
  promoCode?: string;
};

// ArkType 2.2.0 still requires inline tuple-default casts for these query
// schemas. This duplicates the workaround that used to live behind shared
// shape fragments; keep it explicit until the tuple-default limitation is
// removed or centralized again without regressing emitted typings.
export const AdminUserListQuerySchema = type({
  "dateFrom?": DateFromString,
  "dateTo?": DateFromString,
  "userId?": "string",
  "promoCode?": "string",
  limit: [LimitIntFromString, "=", "50"] as unknown as "string.integer.parse",
}) as unknown as SharedQuerySchema<AdminUserListQueryOutput>;

export type AdminUserListQuery = typeof AdminUserListQuerySchema.infer;

interface AdminOnlineHistoryListQueryOutput {
  userId?: string;
  cursor?: string;
  limit: number;
  dateFrom?: Date;
  dateTo?: Date;
  promoCode?: string;
}

export type AdminOnlineHistoryListQueryInput = AdminUserListQueryInput & {
  cursor?: string;
};

export const AdminOnlineHistoryListQuerySchema = type({
  "dateFrom?": DateFromString,
  "dateTo?": DateFromString,
  "userId?": "string",
  "cursor?": "string",
  "promoCode?": "string",
  limit: [LimitIntFromString, "=", "50"] as unknown as "string.integer.parse",
}) as unknown as SharedQuerySchema<AdminOnlineHistoryListQueryOutput>;

export type AdminOnlineHistoryListQuery =
  typeof AdminOnlineHistoryListQuerySchema.infer;

export type AdminKnowledgeBaseListQueryInput = PaginationQueryInput & {
  category?: string;
};

interface AdminKnowledgeBaseListQueryOutput {
  category?: string;
  page: number;
  limit: number;
}

export const AdminKnowledgeBaseListQuerySchema = type({
  ...PaginationFields,
  "category?": "string",
}) as unknown as SharedQuerySchema<AdminKnowledgeBaseListQueryOutput>;

export type AdminKnowledgeBaseListQuery =
  typeof AdminKnowledgeBaseListQuerySchema.infer;
