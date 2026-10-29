import { type } from '@arktype/type'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineWsRoute } from '#app/routing/define-ws-route.js'
import type { ResponseCheck } from '#vendor/utils/validation/validate-response.js'

const executeMiddlewaresMock = vi.fn()
const checkRateLimitWsMock = vi.fn()

vi.mock('#vendor/utils/middlewares/core/execute-httpMiddlewares.js', () => ({
    default: executeMiddlewaresMock,
}))

const { logger } = vi.hoisted(() => {
    const mock = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), child: vi.fn() }
    mock.child.mockReturnValue(mock)
    return { logger: mock }
})
vi.mock('#vendor/utils/logger.js', () => ({ default: logger }))

vi.mock('../rate-limit/ws-rate-limit.js', () => ({
    default: checkRateLimitWsMock,
    createWsRateLimitErrorResponse: vi.fn(),
}))

describe('ws-api-dispatcher validation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        executeMiddlewaresMock.mockResolvedValue(true)
        checkRateLimitWsMock.mockReturnValue({ allowed: true })
    })

    it('returns 422 and does not call handler for invalid WS payload', async () => {
        const handler = vi.fn()
        const route = defineWsRoute({
            url: 'event_typing',
            validator: type({
                roomId: 'string',
            }),
            handler,
        })

        const wsApiDispatcher = (await import('./ws-api-dispatcher.js')).default
        const result = await wsApiDispatcher(
            {
                event: 'event_typing',
                timestamp: Date.now(),
                payload: {
                    roomId: 123,
                },
            },
            {
                getUserData: () => ({
                    token: '',
                }),
            } as never,
            {
                token: '',
            } as never,
            {} as never,
            {
                [route.url]: { ...route, responseCheck: null },
            },
        )

        expect(result).toMatchObject({
            status: 'error',
            error: {
                code: 'validation_failed',
                message: 'Validation failure',
                details: {
                    kind: 'validation',
                    messages: ['roomId must be a string (was a number)'],
                    issues: [{ path: 'roomId', message: 'roomId must be a string (was a number)' }],
                },
            },
        })
        expect(handler).not.toHaveBeenCalled()
    })
})

describe('ws-api-dispatcher runtime response validation (feat-044)', () => {
    const UserSchema = type({ id: 'number', email: 'string' })
    const invalidUser = { id: 'not-a-number', email: 'leak@example.com' }

    beforeEach(async () => {
        vi.clearAllMocks()
        logger.child.mockReturnValue(logger)
        executeMiddlewaresMock.mockResolvedValue(true)
        checkRateLimitWsMock.mockReturnValue({ allowed: true })
        const { __resetResponseValidationLog } =
            await import('#vendor/utils/validation/validate-response.js')
        __resetResponseValidationLog()
    })

    const dispatch = async (data: unknown, responseCheck: ResponseCheck | null) => {
        const route = defineWsRoute({ url: 'user_get', handler: () => data as never })
        const wsApiDispatcher = (await import('./ws-api-dispatcher.js')).default
        return wsApiDispatcher(
            { event: 'user_get', timestamp: 1, payload: null },
            { getUserData: () => ({ token: '' }) } as never,
            { token: '' } as never,
            {} as never,
            { [route.url]: { ...route, responseCheck } },
        )
    }

    const check = async (mode: 'strict' | 'log' | 'off') => {
        const { createResponseCheck } =
            await import('#vendor/utils/validation/validate-response.js')
        return createResponseCheck(UserSchema, { mode, sampleRate: 1 })
    }

    it('strict: error envelope with data null and no validation details', async () => {
        const result = await dispatch(invalidUser, await check('strict'))
        expect(result).toMatchObject({
            status: 'error',
            data: null,
            error: { code: 'internal_error', message: 'Internal server error' },
        })
        expect(result.error).not.toHaveProperty('details')
        expect(JSON.stringify(result)).not.toContain('leak@example.com')
        expect(logger.error).toHaveBeenCalledOnce()
    })

    it('strict: a valid reply is unchanged', async () => {
        const result = await dispatch({ id: 1, email: 'a@b.c' }, await check('strict'))
        expect(result).toMatchObject({
            status: '200',
            data: { id: 1, email: 'a@b.c' },
            error: null,
        })
    })

    it('log: the original envelope is sent and a warn is written', async () => {
        const result = await dispatch(invalidUser, await check('log'))
        expect(result).toMatchObject({ status: '200', data: invalidUser, error: null })
        expect(logger.warn).toHaveBeenCalledOnce()
    })

    it('off: responseCheck is null, nothing is checked or logged', async () => {
        expect(await check('off')).toBeNull()
        const result = await dispatch(invalidUser, null)
        expect(result).toMatchObject({ status: '200', data: invalidUser, error: null })
        expect(logger.warn).not.toHaveBeenCalled()
        expect(logger.error).not.toHaveBeenCalled()
    })
})
