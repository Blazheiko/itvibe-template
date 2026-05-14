import { type } from "@arktype/type";

export const ForgotPasswordInputSchema = type({
  email: "string.email & string <= 255",
  "+": "reject",
});

export type ForgotPasswordInput = typeof ForgotPasswordInputSchema.infer;
