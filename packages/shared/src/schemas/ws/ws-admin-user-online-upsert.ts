import { type } from "@arktype/type";
import { EntityIdSchema } from "../../brands/index.js";

export const WSAdminUserOnlineUpsertPayloadSchema = type({
  id: EntityIdSchema,
  name: "string",
  email: "string",
  appType: "'web' | 'pwa'",
  userAgent: "string",
  connectionsCount: "number",
  "+": "reject",
});

export type WSAdminUserOnlineUpsertPayload =
  typeof WSAdminUserOnlineUpsertPayloadSchema.infer;
