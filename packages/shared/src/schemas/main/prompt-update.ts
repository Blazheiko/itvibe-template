import { type } from "@arktype/type";

export const PromptUpdateInputSchema = type({
  "content?": "string",
  "model?": "string | null",
  "temperature?": "number | null",
  "maxTokens?": "number | null",
  "+": "reject",
});

export type PromptUpdateInput = typeof PromptUpdateInputSchema.infer;
