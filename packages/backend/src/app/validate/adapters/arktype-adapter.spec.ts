import { type } from '@arktype/type'
import { describe, expect, it } from 'vitest'

import { arkValidator } from './arktype-adapter.js'

describe('arkValidator', () => {
    it('returns ok:true with typed value for valid input', () => {
        const schema = type({
            email: 'string.email',
        })

        const result = arkValidator(schema).validate({
            email: 'user@example.com',
        })

        expect(result).toEqual({
            ok: true,
            value: {
                email: 'user@example.com',
            },
        })
    })

    it('returns ok:false with validation messages for invalid input', () => {
        const schema = type({
            email: 'string.email',
        })

        const result = arkValidator(schema).validate({
            email: 'not-an-email',
        })

        expect(result.ok).toBe(false)
        expect(result).toMatchObject({
            ok: false,
            messages: expect.any(Array),
        })
        if (result.ok) {
            throw new Error('Expected validation failure')
        }
        expect(result.messages[0]).toContain('email')
    })

    it('reports every invalid field with its path (code-issues item 26)', () => {
        const schema = type({
            email: 'string.email',
            age: 'number > 0',
            nested: { name: 'string >= 2' },
            '+': 'reject',
        })

        const result = arkValidator(schema).validate({
            email: 'x',
            age: -1,
            nested: { name: 'a' },
            extra: 1,
        })

        if (result.ok) {
            throw new Error('Expected validation failure')
        }
        expect(result.issues).toEqual([
            { path: 'age', message: 'age must be positive (was -1)' },
            { path: 'email', message: 'email must be an email address (was "x")' },
            { path: 'nested.name', message: 'nested.name must be at least length 2 (was 1)' },
            { path: 'extra', message: 'extra must be removed' },
        ])
        // messages stays string[] (clients read details.messages): one line per field.
        expect(result.messages).toEqual(result.issues?.map((issue) => issue.message))
    })

    it('uses an empty path for a root-level problem', () => {
        const result = arkValidator(type('string')).validate(5)

        if (result.ok) {
            throw new Error('Expected validation failure')
        }
        expect(result.issues).toEqual([{ path: '', message: 'must be a string (was a number)' }])
    })

    it('exposes the original schema via describe()', () => {
        const schema = type({
            email: 'string.email',
        })

        expect(arkValidator(schema).describe?.()).toBe(schema)
    })
})
