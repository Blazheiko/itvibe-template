import { type } from "@arktype/type";

export const ResetPhoneCompleteInputSchema = type({
  challengeId: "string >= 1 & string <= 64",
  code: "string >= 4 & string <= 12",
  password: "string >= 8 & string <= 32",
  passwordConfirm: "string >= 8 & string <= 32",
  "+": "reject",
});

export type ResetPhoneCompleteInput = typeof ResetPhoneCompleteInputSchema.infer;
