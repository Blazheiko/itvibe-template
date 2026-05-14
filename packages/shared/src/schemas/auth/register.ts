import { type } from "@arktype/type";

export const RegisterInputSchema = type({
  name: "string >= 1 & string <= 100",
  email: "string.email & string <= 255",
  password: "string >= 8 & string <= 32",
  "token?": "string <= 60",
  "langLearning?": "string >= 2 & string <= 10",
  "langNative?": "string >= 2 & string <= 10",
  "promoCode?": "string >= 1 & string <= 50",
  "refCode?": "string >= 1 & string <= 16",
  "clickId?": "string >= 1 & string <= 20",
  "+": "reject",
});

export type RegisterInput = (typeof RegisterInputSchema)["inferIn"];
