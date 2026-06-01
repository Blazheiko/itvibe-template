import { type } from "@arktype/type";

export const RegisterInputSchema = type({
  name: "string >= 1 & string <= 100",
  email: "string.email & string <= 255",
  password: "string >= 8 & string <= 32",
  token: "string <= 60",
  "+": "reject",
});

export type RegisterInput = (typeof RegisterInputSchema)["inferIn"];
