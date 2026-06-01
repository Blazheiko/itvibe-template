import { type } from "@arktype/type";

export const RegisterPhoneStartInputSchema = type({
  phone: "string >= 6 & string <= 32",
  "defaultCountry?": "string == 2",
  "+": "reject",
});

export type RegisterPhoneStartInput = typeof RegisterPhoneStartInputSchema.infer;
