import { type } from '@arktype/type'

// Canonical id of a database row as a string ("42"): a branded type, so a plain
// string has to pass the schema before it can be used as an EntityId.
export const EntityIdSchema = type(/^[1-9]\d*$/).brand('EntityId')
export type EntityId = typeof EntityIdSchema.infer
