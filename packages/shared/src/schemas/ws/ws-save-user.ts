import { type } from "@arktype/type";

export const WSSaveUserPayloadSchema = type({
  name: "string >= 1 & string <= 100",
  email: "string.email & string <= 255",
  password: "string >= 8 & string <= 32",
  "+": "reject",
});

export type WSSaveUserPayload = typeof WSSaveUserPayloadSchema.infer;
