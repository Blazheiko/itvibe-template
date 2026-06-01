import { type } from "@arktype/type";

export const LinkPhoneConfirmInputSchema = type({
  challengeId: "string >= 1 & string <= 64",
  code: "string >= 4 & string <= 12",
  "+": "reject",
});

export type LinkPhoneConfirmInput = typeof LinkPhoneConfirmInputSchema.infer;
