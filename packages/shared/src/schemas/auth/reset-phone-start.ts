import { type } from "@arktype/type";

export const ResetPhoneStartInputSchema = type({
  phone: "string >= 6 & string <= 32",
  "defaultCountry?": "string == 2",
  "+": "reject",
});

export type ResetPhoneStartInput = typeof ResetPhoneStartInputSchema.infer;
