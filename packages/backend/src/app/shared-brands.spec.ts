import { type } from '@arktype/type'
import { EntityIdSchema, type EntityId } from 'shared'
import { describe, expect, it } from 'vitest'

// EntityId is branded (code-issues item 58): typecheck rejects a plain string,
// a value is an EntityId only after EntityIdSchema accepted it.
const takesId = (id: EntityId): string => id

describe('EntityId brand', () => {
    it('is produced by the schema', () => {
        const parsed = EntityIdSchema('42')
        if (parsed instanceof type.errors) throw new Error(parsed.summary)
        expect(takesId(parsed)).toBe('42')
    })

    it('is not assignable from a plain string', () => {
        // @ts-expect-error a plain string is not an EntityId
        const id: EntityId = '42'
        expect(id).toBe('42')
    })
})
