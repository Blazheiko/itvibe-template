import { type } from "@arktype/type";
import { CanonicalErrorResponseSchema } from "./error-response.js";

export const PushSubscriptionSchema = type({
  id: "string",
  userId: "string",
  endpoint: "string",
  p256dhKey: "string",
  authKey: "string",
  userAgent: "string | null",
  ipAddress: "string | null",
  deviceType: "string | null",
  browserName: "string | null",
  browserVersion: "string | null",
  osName: "string | null",
  osVersion: "string | null",
  notificationTypes: "('mention' | 'system')[] | null",
  timezone: "string | null",
  isActive: "boolean",
  lastUsedAt: "Date | null",
  createdAt: "Date",
  updatedAt: "Date",
  "notificationLogs?": "unknown[]",
});
export type PushSubscription = typeof PushSubscriptionSchema.infer;

export const PushSubscriptionLogSchema = type({
  id: "string",
  "subscriptionId?": "string | null",
  "userId?": "string | null",
  status: "string | null",
  "errorMessage?": "string | null",
  "messageTitle?": "string | null",
  "messageBody?": "string | null",
  "messageData?": "unknown",
  "responseData?": "unknown",
  sentAt: "Date",
});
export type PushSubscriptionLog = typeof PushSubscriptionLogSchema.infer;

export const PushSubscriptionLogSummarySchema = type({
  id: "string",
  messageTitle: "string | null",
  status: "string | null",
  sentAt: "Date",
});
export type PushSubscriptionLogSummary =
  typeof PushSubscriptionLogSummarySchema.infer;

export const GetSubscriptionsResponseSchema = type.or(
  { status: "'success'", "message?": "string", "subscriptions?": "unknown[]" },
  CanonicalErrorResponseSchema,
);
export type GetSubscriptionsResponse = typeof GetSubscriptionsResponseSchema.infer;

export const CreateSubscriptionResponseSchema = type.or(
  { status: "'success'", "message?": "string", "subscription?": "unknown" },
  CanonicalErrorResponseSchema,
);
export type CreateSubscriptionResponse = typeof CreateSubscriptionResponseSchema.infer;

export const GetSubscriptionResponseSchema = type.or(
  { status: "'success'", "message?": "string", "data?": "unknown | null" },
  CanonicalErrorResponseSchema,
);
export type GetSubscriptionResponse = typeof GetSubscriptionResponseSchema.infer;

export const UpdateSubscriptionResponseSchema = type.or(
  { status: "'success'", "message?": "string", "subscription?": "unknown | null" },
  CanonicalErrorResponseSchema,
);
export type UpdateSubscriptionResponse = typeof UpdateSubscriptionResponseSchema.infer;

export const DeleteSubscriptionResponseSchema = type.or(
  { status: "'success'", "message?": "string" },
  CanonicalErrorResponseSchema,
);
export type DeleteSubscriptionResponse = typeof DeleteSubscriptionResponseSchema.infer;

export const GetSubscriptionLogsResponseSchema = type.or(
  { status: "'success'", "message?": "string", "data?": "unknown[]" },
  CanonicalErrorResponseSchema,
);
export type GetSubscriptionLogsResponse = typeof GetSubscriptionLogsResponseSchema.infer;

export const GetSubscriptionStatisticsResponseSchema = type.or(
  {
    status: "'success'",
    "message?": "string",
    "data?": {
      subscription: "unknown",
      statistics: "unknown",
    },
  },
  CanonicalErrorResponseSchema,
);
export type GetSubscriptionStatisticsResponse = typeof GetSubscriptionStatisticsResponseSchema.infer;

export const DeactivateSubscriptionResponseSchema = type.or(
  { status: "'success'", "message?": "string", "data?": "unknown | null" },
  CanonicalErrorResponseSchema,
);
export type DeactivateSubscriptionResponse = typeof DeactivateSubscriptionResponseSchema.infer;

export const GetVapidPublicKeyResponseSchema = type.or(
  { status: "'success'", "message?": "string", "vapidPublicKey?": "string" },
  CanonicalErrorResponseSchema,
);
export type GetVapidPublicKeyResponse = typeof GetVapidPublicKeyResponseSchema.infer;

export const TestPushResponseSchema = type.or(
  { status: "'success'", message: "string", "sent?": "number", "failed?": "number" },
  CanonicalErrorResponseSchema,
);
export type TestPushResponse = typeof TestPushResponseSchema.infer;
