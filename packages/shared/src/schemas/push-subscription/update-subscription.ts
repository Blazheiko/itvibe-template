import { type } from "@arktype/type";

export const UpdateSubscriptionInputSchema = type({
  "isActive?": "boolean",
  "notificationTypes?": "('mention' | 'system')[]",
  "timezone?": "string",
  "deviceType?": "string",
  "browserName?": "string",
  "browserVersion?": "string",
  "osName?": "string",
  "osVersion?": "string",
  "+": "reject",
});

export type UpdateSubscriptionInput = typeof UpdateSubscriptionInputSchema.infer;
