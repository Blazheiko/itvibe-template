import { describe, expect, it } from 'vitest'

import { matchesIfNoneMatch } from './if-none-match.js'

const ETAG = '"abc"'

describe('matchesIfNoneMatch (code-issues item 40)', () => {
    it.each([
        ['the exact tag', '"abc"', true],
        ['a weak copy of the tag', 'W/"abc"', true],
        ['the tag inside a list', '"x", "abc" ,"y"', true],
        ['a weak tag inside a list', '"x", W/"abc"', true],
        ['the wildcard', '*', true],
        ['another tag', '"abd"', false],
        ['a list without the tag', '"x", "y"', false],
        ['an empty header', '', false],
        ['a tag without quotes', 'abc', false],
    ])('%s → %s', (_name, header, expected) => {
        expect(matchesIfNoneMatch(header, ETAG)).toBe(expected)
    })

    it('treats a weak current etag the same way', () => {
        expect(matchesIfNoneMatch('"abc"', 'W/"abc"')).toBe(true)
    })
})
