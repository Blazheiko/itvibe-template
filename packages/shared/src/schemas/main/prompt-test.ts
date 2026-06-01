import { type } from "@arktype/type";

export const PromptTestInputSchema = type({
  message: "string >= 1",
  "+": "reject",
});

export type PromptTestInput = typeof PromptTestInputSchema.infer;
