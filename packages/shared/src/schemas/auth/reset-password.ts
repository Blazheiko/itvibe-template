import { type } from "@arktype/type";

export const ResetPasswordInputSchema = type({
  token: "string >= 1 & string <= 255",
  password: "string >= 8 & string <= 32",
  passwordConfirm: "string >= 8 & string <= 32",
  "+": "reject",
});

export type ResetPasswordInput = typeof ResetPasswordInputSchema.infer;
