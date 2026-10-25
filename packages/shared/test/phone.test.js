import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    PhoneNormalizationError,
    looksLikePhoneNumber,
    normalizePhoneNumber,
} from '../dist/utils/index.js'

test('normalizePhoneNumber returns E.164', () => {
    assert.equal(normalizePhoneNumber('+380 (67) 123-45-67'), '+380671234567')
    assert.equal(normalizePhoneNumber(' +1 415 555 2671 '), '+14155552671')
    assert.equal(normalizePhoneNumber('067 123 45 67', 'UA'), '+380671234567')
})

test('normalizePhoneNumber rejects empty and invalid numbers', () => {
    for (const input of ['', '   ', '12345', '+380 12', 'not a phone']) {
        assert.throws(() => normalizePhoneNumber(input), PhoneNormalizationError, input)
    }
})

test('looksLikePhoneNumber tells phone input from an email', () => {
    assert.equal(looksLikePhoneNumber('+380 67 123 45 67'), true)
    assert.equal(looksLikePhoneNumber('(415) 555-2671'), true)
    assert.equal(looksLikePhoneNumber('user@example.com'), false)
    assert.equal(looksLikePhoneNumber('12'), false)
})
