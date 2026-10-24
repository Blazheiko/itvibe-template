import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpContext, SessionInfo } from '#vendor/types/types.js'

const VALID_CSRF_TOKEN = 'a'.repeat(43)
const ROTATED_CSRF_TOKEN = 'b'.repeat(43)

const sessionHandlerMock = vi.hoisted(() => vi.fn())

vi.mock('#vendor/utils/session/session-handler.js', () => ({
    sessionHandler: sessionHandlerMock,
}))
vi.mock('#vendor/utils/session/resolve-session-cookie.js', () => ({
    resolveSessionCookie: () => ({ token: undefined, source: 'current' }),
}))
vi.mock('#vendor/utils/session/delete-legacy-session-cookie.js', () => ({
    deleteLegacySessionCookie: vi.fn(),
}))

const { default: sessionWeb } = await import('./session-web.js')

const childLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
const loggerChild = vi.fn(() => childLogger)

const createContext = (sessionInfo: SessionInfo | null, userId: string | null = null) =>
    ({
        httpData: { cookies: new Map() },
        responseData: { payload: null, status: 200 },
        session: { sessionInfo },
        auth: { getUserId: () => userId },
        logger: { child: loggerChild },
    }) as unknown as HttpContext

const createSession = (csrfToken: string | undefined): SessionInfo => ({
    id: 'session-id',
    createdAt: new Date().toISOString(),
    data: csrfToken === undefined ? {} : { csrfToken },
})

describe('sessionWeb CSRF delivery', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('attaches the session token to a guard rejection so anonymous visitors can sign in', async () => {
        const context = createContext(createSession(VALID_CSRF_TOKEN))

        await sessionWeb(context, async () => {
            context.responseData.status = 401
            context.responseData.payload = {
                status: 'error',
                code: 'unauthorized',
                message: 'Session expired or not found',
            }
        })

        expect(context.responseData.payload).toEqual({
            status: 'error',
            code: 'unauthorized',
            message: 'Session expired or not found',
            csrfToken: VALID_CSRF_TOKEN,
        })
    })

    it('keeps a token the payload already carries', async () => {
        const context = createContext(createSession(VALID_CSRF_TOKEN))

        await sessionWeb(context, async () => {
            context.responseData.payload = {
                status: 'error',
                csrfToken: ROTATED_CSRF_TOKEN,
            }
        })

        expect((context.responseData.payload as Record<string, unknown>)['csrfToken']).toBe(
            ROTATED_CSRF_TOKEN,
        )
    })

    it('leaves an empty payload alone so route handlers stay in control', async () => {
        const context = createContext(createSession(VALID_CSRF_TOKEN))

        await sessionWeb(context, async () => {
            // A route handler runs after the middleware chain unwinds.
        })

        expect(context.responseData.payload).toBeNull()
    })

    it('does nothing when the session has no valid token', async () => {
        const context = createContext(createSession(undefined))

        await sessionWeb(context, async () => {
            context.responseData.payload = { status: 'error' }
        })

        expect(context.responseData.payload).toEqual({ status: 'error' })
    })
})

describe('sessionWeb request logger (code-issues item 33)', () => {
    it('binds userId to the request logger once the session names a user', async () => {
        const context = createContext(createSession(VALID_CSRF_TOKEN), '42')
        loggerChild.mockClear()

        await sessionWeb(context, async () => {})

        expect(loggerChild).toHaveBeenCalledWith({ userId: '42' })
        expect(context.logger).toBe(childLogger)
    })

    it('leaves the logger alone for an anonymous request', async () => {
        const context = createContext(createSession(VALID_CSRF_TOKEN))
        const original = context.logger
        loggerChild.mockClear()

        await sessionWeb(context, async () => {})

        expect(loggerChild).not.toHaveBeenCalled()
        expect(context.logger).toBe(original)
    })
})
