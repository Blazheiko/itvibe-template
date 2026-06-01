import { type } from "@arktype/type";

export const SaveUserInputSchema = type({
  name: "string >= 1 & string <= 100",
  email: "string.email & string <= 255",
  password: "string >= 8 & string <= 32",
  "+": "reject",
});

export type SaveUserInput = typeof SaveUserInputSchema.infer;
