import { beforeEach, describe, expect, it } from 'vitest'

import {
    getCsrfToken,
    readCsrfTokenFromMeta,
    setCsrfToken,
    updateCsrfTokenFromResponse,
} from '../csrf-token'

const VALID_CSRF_TOKEN = 'a'.repeat(43)
const SECOND_CSRF_TOKEN = 'b'.repeat(43)

describe('csrf-token', () => {
    beforeEach(() => {
        document.head.innerHTML = ''
    })

    it('reads valid tokens from the meta tag', () => {
        document.head.innerHTML = `<meta name="csrf-token" content="${VALID_CSRF_TOKEN}">`

        expect(readCsrfTokenFromMeta()).toBe(VALID_CSRF_TOKEN)
        expect(getCsrfToken()).toBe(VALID_CSRF_TOKEN)
    })

    it('ignores invalid token alphabet', () => {
        document.head.innerHTML = '<meta name="csrf-token" content="abc+123">'

        expect(readCsrfTokenFromMeta()).toBeNull()
    })

    it('updates token from API responses', () => {
        setCsrfToken(VALID_CSRF_TOKEN)
        updateCsrfTokenFromResponse({ csrfToken: SECOND_CSRF_TOKEN })

        expect(getCsrfToken()).toBe(SECOND_CSRF_TOKEN)
    })
})
