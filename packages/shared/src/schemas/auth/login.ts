import { type } from "@arktype/type";

export const LoginInputSchema = type({
  email: "string.email & string <= 255",
  password: "string >= 8 & string <= 32",
  "token?": "string <= 60",
  "+": "reject",
});

export type LoginInput = typeof LoginInputSchema.infer;
