import { beforeEach, describe, expect, it, vi } from 'vitest'

const VALID_CSRF_TOKEN = 'a'.repeat(43)
const SECOND_CSRF_TOKEN = 'b'.repeat(43)

const loadModule = async () => await import('../csrf-token')

describe('csrf-token', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    it('starts empty and synced because the HTML shell carries no token', async () => {
        const { getCsrfToken, getConfirmedUserId, getSessionState } = await loadModule()

        expect(getCsrfToken()).toBeNull()
        expect(getConfirmedUserId()).toBeNull()
        expect(getSessionState()).toBe('synced')
    })

    it('confirms a valid token together with its owner', async () => {
        const { confirmCsrfToken, getCsrfToken, getConfirmedUserId } = await loadModule()

        expect(confirmCsrfToken(VALID_CSRF_TOKEN, '7')).toBe(true)

        expect(getCsrfToken()).toBe(VALID_CSRF_TOKEN)
        expect(getConfirmedUserId()).toBe('7')
    })

    it.each([['abc+123'], ['short'], [undefined], [42]])('ignores %j', async (token) => {
        const { confirmCsrfToken, getCsrfToken } = await loadModule()

        expect(confirmCsrfToken(token, null)).toBe(false)
        expect(getCsrfToken()).toBeNull()
    })

    it('never sends an unconfirmed token', async () => {
        const { confirmCsrfToken, getCsrfToken, getUnconfirmedCsrfToken, setUnconfirmedCsrfToken } =
            await loadModule()
        confirmCsrfToken(VALID_CSRF_TOKEN, '7')

        setUnconfirmedCsrfToken(SECOND_CSRF_TOKEN)

        expect(getCsrfToken()).toBe(VALID_CSRF_TOKEN)
        expect(getUnconfirmedCsrfToken()).toBe(SECOND_CSRF_TOKEN)
    })

    it('a confirmation clears the unconfirmed token', async () => {
        const { confirmCsrfToken, getUnconfirmedCsrfToken, setUnconfirmedCsrfToken } =
            await loadModule()
        setUnconfirmedCsrfToken(SECOND_CSRF_TOKEN)

        confirmCsrfToken(VALID_CSRF_TOKEN, '7')

        expect(getUnconfirmedCsrfToken()).toBeNull()
    })

    it('reloading is terminal: it drops the token and refuses new ones', async () => {
        const { confirmCsrfToken, enterReloading, getCsrfToken, getSessionState, setSessionState } =
            await loadModule()
        confirmCsrfToken(VALID_CSRF_TOKEN, '7')

        enterReloading()
        setSessionState('synced')

        expect(getSessionState()).toBe('reloading')
        expect(getCsrfToken()).toBeNull()
        expect(confirmCsrfToken(SECOND_CSRF_TOKEN, '7')).toBe(false)
        expect(getCsrfToken()).toBeNull()
    })
})
