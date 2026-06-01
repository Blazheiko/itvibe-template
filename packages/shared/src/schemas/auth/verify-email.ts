import { type } from "@arktype/type";

export const VerifyEmailInputSchema = type({
  token: "string >= 1 & string <= 255",
  "+": "reject",
});

export type VerifyEmailInput = typeof VerifyEmailInputSchema.infer;
