import { Result } from 'better-result'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The OAuth callback is a browser navigation: every outcome must be a 302 back to the
// frontend, never an error status that leaves the user on a raw JSON page.

const { handleCallback, getConfiguredProviders } = vi.hoisted(() => ({
    handleCallback: vi.fn(),
    getConfiguredProviders: vi.fn(),
}))

vi.mock('#app/services/auth/oauth-service.js', () => ({
    OAUTH_EMAIL_UNVERIFIED: 'oauth_email_unverified',
    oauthService: { handleCallback, getConfiguredProviders },
}))
vi.mock('#config/oauth.js', () => ({
    default: {
        frontendSuccessUrl: '/?oauth=success',
        frontendErrorUrl: '/?error=oauth_failed',
    },
}))

const { default: OAuthController } = await import('./oauth-controller.js')

const createContext = (query: { code?: string; state?: string }, storedState = 'state-1') => {
    const headers = new Map<string, string>()
    return {
        logger: { info: vi.fn(), warn: vi.fn() },
        httpData: { params: { provider: 'google' }, query },
        responseData: {
            status: 200,
            setHeader: (name: string, value: string) => headers.set(name, value),
        },
        session: {
            sessionInfo: { id: 's1', data: { oauthState: storedState } },
            updateSessionData: vi.fn(),
        },
        auth: {},
        headers,
    } as never as Parameters<typeof OAuthController.callback>[0] & {
        headers: Map<string, string>
    }
}

describe('OAuthController.callback', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('redirects to the success URL after login', async () => {
        handleCallback.mockResolvedValue(Result.ok({ redirectUrl: '/?oauth=success' }))
        const context = createContext({ code: 'c', state: 'state-1' })

        await OAuthController.callback(context)

        expect(context.responseData.status).toBe(302)
        expect(context.headers.get('Location')).toBe('/?oauth=success')
    })

    it('redirects to the error URL when parameters are missing', async () => {
        const context = createContext({ state: 'state-1' })

        const response = await OAuthController.callback(context)

        expect(context.responseData.status).toBe(302)
        expect(context.headers.get('Location')).toBe('/?error=oauth_failed')
        expect(response).toEqual({ status: 'error', message: 'Missing OAuth parameters' })
        expect(handleCallback).not.toHaveBeenCalled()
    })

    it('keeps the 302 when the service fails', async () => {
        handleCallback.mockResolvedValue(
            Result.err({ _tag: 'BadRequest', message: 'OAuth state mismatch' }),
        )
        const context = createContext({ code: 'c', state: 'other' })

        await OAuthController.callback(context)

        expect(context.responseData.status).toBe(302)
        expect(context.headers.get('Location')).toBe('/?error=oauth_failed')
    })

    it('adds the reason when an existing account needs a verified email', async () => {
        handleCallback.mockResolvedValue(
            Result.err({
                _tag: 'Conflict',
                message: 'An account with this email already exists.',
                reason: 'oauth_email_unverified',
            }),
        )
        const context = createContext({ code: 'c', state: 'state-1' })

        await OAuthController.callback(context)

        expect(context.responseData.status).toBe(302)
        expect(context.headers.get('Location')).toBe(
            '/?error=oauth_failed&reason=oauth_email_unverified',
        )
    })
})

describe('OAuthController.providers', () => {
    it('returns the configured providers', () => {
        getConfiguredProviders.mockReturnValue(['google', 'github'])

        const response = OAuthController.providers(createContext({}) as never)

        expect(response).toEqual({ status: 'ok', providers: ['google', 'github'] })
    })
})
