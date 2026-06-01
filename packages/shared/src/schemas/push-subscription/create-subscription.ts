import { type } from "@arktype/type";

export const CreateSubscriptionInputSchema = type({
  endpoint: "string >= 1",
  p256dhKey: "string >= 1",
  authKey: "string >= 1",
  "userAgent?": "string",
  "ipAddress?": "string",
  "deviceType?": "string",
  "browserName?": "string",
  "browserVersion?": "string",
  "osName?": "string",
  "osVersion?": "string",
  "notificationTypes?": "('mention' | 'system')[]",
  "timezone?": "string",
  "+": "reject",
});

export type CreateSubscriptionInput = typeof CreateSubscriptionInputSchema.infer;
