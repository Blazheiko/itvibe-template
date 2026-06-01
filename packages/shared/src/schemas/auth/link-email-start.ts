import { type } from "@arktype/type";

export const LinkEmailStartInputSchema = type({
  email: "string.email & string <= 255",
  currentPassword: "string >= 8 & string <= 32",
  "+": "reject",
});

export type LinkEmailStartInput = typeof LinkEmailStartInputSchema.infer;
