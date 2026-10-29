import { describe, expect, it } from 'vitest'
import { hasResponseBody, isEmptyPayload } from './response-body.js'

describe('hasResponseBody', () => {
    it.each([
        [200, { ok: true }, true],
        [201, { id: 1 }, true],
        [200, null, false],
        [200, undefined, false],
        [201, null, false],
        [200, false, true],
        [200, 0, true],
        [200, '', true],
        [204, { ok: true }, false],
        [205, null, false],
        [301, null, false],
        [302, { location: '/x' }, false],
        [304, null, false],
        [400, { status: 'error' }, true],
        [404, null, true],
        [503, { status: 'unavailable' }, true],
    ])('status %i with %j -> %j', (status, payload, expected) => {
        expect(hasResponseBody(status, payload)).toBe(expected)
    })
})

describe('isEmptyPayload', () => {
    it.each([
        [null, true],
        [undefined, true],
        [false, false],
        [0, false],
        ['', false],
        [{}, false],
    ])('%j -> %j', (payload, expected) => {
        expect(isEmptyPayload(payload)).toBe(expected)
    })
})
