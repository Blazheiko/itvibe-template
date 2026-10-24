import { describe, expect, it, vi } from 'vitest'

import { ValidationError } from '#app/validate/errors/validation-error.js'
import type { HttpResponse } from './server.js'

// handleError logs with the request's child logger (code-issues item 33): the
// warn records of 413/415/422 carry requestId (and userId when known).
const childCalls: Record<string, unknown>[] = []
const childLogger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }
const logger = vi.hoisted(() => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
}))
vi.mock('#vendor/utils/logger.js', () => ({ default: logger }))
vi.mock('uWebSockets.js', () => ({ App: () => ({}) }))
vi.mock('#app/routes/http-routes.js', () => ({ default: [] }))
vi.mock('#app/routes/ws-routes.js', () => ({ default: [] }))

vi.stubEnv('APP_KEY', 'a'.repeat(32))

logger.child.mockImplementation((bindings: Record<string, unknown>) => {
    childCalls.push(bindings)
    return childLogger
})

const { handleError } = await import('./server.js')
const { PayloadTooLargeError } =
    await import('#vendor/utils/network/errors/payload-too-large-error.js')

const res = (): HttpResponse => {
    const r = {
        cork: (cb: () => void) => {
            cb()
            return r
        },
        writeStatus: () => r,
        writeHeader: () => r,
        end: () => r,
    }
    return r as unknown as HttpResponse
}

describe('handleError logging', () => {
    it('422: warn through a child logger with requestId and userId', () => {
        handleError(res(), new ValidationError(['bad']), {
            requestId: 'req-1',
            userId: '7',
            route: 'api/x',
            method: 'post',
        })

        expect(childCalls.at(-1)).toEqual({
            requestId: 'req-1',
            userId: '7',
            route: 'api/x',
            method: 'post',
        })
        expect(childLogger.warn).toHaveBeenCalled()
        expect(logger.warn).not.toHaveBeenCalled()
    })

    it('413 without a known user: requestId only', () => {
        handleError(res(), new PayloadTooLargeError(10, 'json'), { requestId: 'req-2' })

        expect(childCalls.at(-1)).toEqual({ requestId: 'req-2' })
        expect(childLogger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ limit: 10 }),
            'Payload too large',
        )
    })
})
