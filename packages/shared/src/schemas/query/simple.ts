import { type, type Type } from "@arktype/type";
import type { PositiveIntInput } from "./types.js";

export const PromoValidateQuerySchema = type({
  code: "string > 0",
});

export type PromoValidateQuery = typeof PromoValidateQuerySchema.infer;
export type PromoValidateQueryInput = PromoValidateQuery;

export const AdminUserSearchQuerySchema = type({
  email: "string > 0",
});

export type AdminUserSearchQuery = typeof AdminUserSearchQuerySchema.infer;
export type AdminUserSearchQueryInput = AdminUserSearchQuery;

export const AdminPartnerSearchQuerySchema = type({
  email: "string > 0",
});

export type AdminPartnerSearchQuery = typeof AdminPartnerSearchQuerySchema.infer;
export type AdminPartnerSearchQueryInput = AdminPartnerSearchQuery;

export const PushSubscriptionTestQuerySchema = type({
  "title?": "string",
  "body?": "string",
});

export type PushSubscriptionTestQuery =
  typeof PushSubscriptionTestQuerySchema.infer;
export type PushSubscriptionTestQueryInput = PushSubscriptionTestQuery;

export const TeacherLangQuerySchema = type({
  "langLearning?": "string",
});

export type TeacherLangQuery = typeof TeacherLangQuerySchema.infer;
export type TeacherLangQueryInput = TeacherLangQuery;

export type TeacherLangLimitQueryInput = TeacherLangQueryInput & {
  limit?: PositiveIntInput;
};

export type TeacherLangLimitQuery = TeacherLangQuery & {
  limit?: number;
};

export const TeacherLangLimitQuerySchema = type({
  "langLearning?": "string",
  "limit?": "string.integer.parse",
}) as unknown as Type<TeacherLangLimitQuery>;

export const TeacherVoicesPreviewQuerySchema = type({
  voiceId: "string > 0",
  lang: "string > 0",
});

export type TeacherVoicesPreviewQuery =
  typeof TeacherVoicesPreviewQuerySchema.infer;
export type TeacherVoicesPreviewQueryInput = TeacherVoicesPreviewQuery;

export const OAuthRedirectQuerySchema = type({
  "refCode?": "string",
  "clickId?": "string",
  "promoCode?": "string",
});

export type OAuthRedirectQuery = typeof OAuthRedirectQuerySchema.infer;
export type OAuthRedirectQueryInput = OAuthRedirectQuery;

export const OAuthCallbackQuerySchema = type({
  "code?": "string",
  "state?": "string",
});

export type OAuthCallbackQuery = typeof OAuthCallbackQuerySchema.infer;
export type OAuthCallbackQueryInput = OAuthCallbackQuery;
