import { type } from "@arktype/type";

export const RegisterPhoneConfirmInputSchema = type({
  challengeId: "string >= 8 & string <= 64",
  code: "string >= 4 & string <= 12",
  "+": "reject",
});

export type RegisterPhoneConfirmInput = typeof RegisterPhoneConfirmInputSchema.infer;
