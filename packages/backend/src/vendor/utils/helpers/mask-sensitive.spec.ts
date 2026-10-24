import { describe, expect, it } from 'vitest'
import { maskEmailForLogs, maskPhoneForLogs, maskTokenForLogs } from './mask-sensitive.js'

describe('maskPhoneForLogs', () => {
    it('masks normalized international phone numbers', () => {
        expect(maskPhoneForLogs('+14155550123')).toBe('+14*******23')
    })

    it('fully redacts short phone numbers', () => {
        expect(maskPhoneForLogs('1234')).toBe('****')
    })
})

describe('maskEmailForLogs', () => {
    it('masks local and domain parts while keeping the tld', () => {
        expect(maskEmailForLogs('User.Name@example.com')).toBe('u*******e@e*****e.com')
    })

    it('falls back for malformed email values', () => {
        expect(maskEmailForLogs('not-an-email')).toBe('[redacted-email]')
    })
})

describe('maskTokenForLogs', () => {
    it('keeps only a short prefix of long tokens', () => {
        expect(maskTokenForLogs('abcdef0123456789abcdef')).toBe('abcd…')
    })

    it('fully redacts short or missing tokens', () => {
        expect(maskTokenForLogs('short')).toBe('[redacted-token]')
        expect(maskTokenForLogs(undefined)).toBe('[redacted-token]')
    })
})
