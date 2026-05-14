import { type } from "@arktype/type";

export const ChangePasswordInputSchema = type({
  "currentPassword?": "string >= 8 & string <= 32",
  newPassword: "string >= 8 & string <= 32",
  "+": "reject",
});

export type ChangePasswordInput = typeof ChangePasswordInputSchema.infer;
