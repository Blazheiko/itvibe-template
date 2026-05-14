import { type } from "@arktype/type";

export const UpdateSubscriptionInputSchema = type({
  "isActive?": "boolean",
  "notificationTypes?": "('new_message' | 'mention' | 'call' | 'system')[]",
  "timezone?": "string",
  "deviceType?": "string",
  "browserName?": "string",
  "browserVersion?": "string",
  "osName?": "string",
  "osVersion?": "string",
  "+": "reject",
});

export type UpdateSubscriptionInput = typeof UpdateSubscriptionInputSchema.infer;
