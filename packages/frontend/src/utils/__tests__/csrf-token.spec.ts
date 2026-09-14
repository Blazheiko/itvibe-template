import { beforeEach, describe, expect, it, vi } from 'vitest'

const VALID_CSRF_TOKEN = 'a'.repeat(43)
const SECOND_CSRF_TOKEN = 'b'.repeat(43)

const loadModule = async () => await import('../csrf-token')

describe('csrf-token', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    it('starts empty because the HTML shell carries no token', async () => {
        const { getCsrfToken } = await loadModule()

        expect(getCsrfToken()).toBeNull()
    })

    it('stores valid tokens', async () => {
        const { getCsrfToken, setCsrfToken } = await loadModule()

        setCsrfToken(VALID_CSRF_TOKEN)

        expect(getCsrfToken()).toBe(VALID_CSRF_TOKEN)
    })

    it('ignores invalid token alphabet', async () => {
        const { getCsrfToken, setCsrfToken } = await loadModule()

        setCsrfToken('abc+123')

        expect(getCsrfToken()).toBeNull()
    })

    it('updates token from API responses', async () => {
        const { getCsrfToken, setCsrfToken, updateCsrfTokenFromResponse } = await loadModule()

        setCsrfToken(VALID_CSRF_TOKEN)
        expect(updateCsrfTokenFromResponse({ csrfToken: SECOND_CSRF_TOKEN })).toBe(true)

        expect(getCsrfToken()).toBe(SECOND_CSRF_TOKEN)
    })

    it('reports no update when the response carries no token', async () => {
        const { updateCsrfTokenFromResponse } = await loadModule()

        expect(updateCsrfTokenFromResponse({ status: 'success' })).toBe(false)
    })
})
