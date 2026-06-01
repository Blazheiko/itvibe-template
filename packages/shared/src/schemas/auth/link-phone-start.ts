import { type } from "@arktype/type";

export const LinkPhoneStartInputSchema = type({
  phone: "string >= 6 & string <= 32",
  currentPassword: "string >= 8 & string <= 32",
  "defaultCountry?": "string == 2",
  "+": "reject",
});

export type LinkPhoneStartInput = typeof LinkPhoneStartInputSchema.infer;
