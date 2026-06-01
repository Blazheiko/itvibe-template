import { type } from "@arktype/type";

export const EntityIdSchema = type(/^[1-9]\d*$/);
export type EntityId = typeof EntityIdSchema.infer;
