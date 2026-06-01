import { type } from "@arktype/type";

export const EmptyFormInputSchema = type({
  "+": "reject",
});

export type EmptyFormInput = typeof EmptyFormInputSchema.infer;
