import type { HttpResponse } from 'uWebSockets.js'
import { describe, expect, it, vi } from 'vitest'

import { ValidationError } from '#app/validate/errors/validation-error.js'

vi.mock('uWebSockets.js', () => ({
    App: () => ({}),
}))

vi.mock('#app/routes/http-routes.js', () => ({
    default: [],
}))

vi.mock('#app/routes/ws-routes.js', () => ({
    default: [],
}))

vi.mock('#vendor/utils/network/ws-handlers.js', () => ({
    onMessage: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    handleUpgrade: vi.fn(),
    closeAllWs: vi.fn(),
}))

vi.mock('#vendor/start/static-server.js', () => ({
    cacheStaticSource: vi.fn().mockResolvedValue(null),
    staticHandler: vi.fn(),
    staticCacheHandler: vi.fn(),
}))

vi.mock('#vendor/utils/middlewares/core/execute-httpMiddlewares.js', () => ({
    default: vi.fn().mockResolvedValue(true),
}))

describe('handleError', () => {
    it('writes 422 status before headers for validation errors', async () => {
        const { handleError } = await import('./server.js')
        const calls: string[] = []
        const res = {
            cork: vi.fn((callback: () => void) => {
                callback()
                return res
            }),
            writeStatus: vi.fn((value: string) => {
                calls.push(`status:${value}`)
                return res
            }),
            writeHeader: vi.fn((name: string) => {
                calls.push(`header:${name}`)
                return res
            }),
            end: vi.fn((body: string) => {
                calls.push(`end:${body}`)
                return res
            }),
        } as unknown as HttpResponse

        handleError(
            res,
            new ValidationError(['email must be an email address (was "sample_email")']),
        )

        expect(calls[0]).toBe('status:422 Unprocessable Entity')
        expect(calls).toContain('header:content-type')
        expect(calls.at(-1)).toContain('"message":"Validation failure"')
    })

    it('puts per-field issues next to messages in the 422 details (code-issues item 26)', async () => {
        const { handleError } = await import('./server.js')
        let body = ''
        const res = {
            cork: vi.fn((callback: () => void) => {
                callback()
                return res
            }),
            writeStatus: vi.fn(() => res),
            writeHeader: vi.fn(() => res),
            end: vi.fn((value: string) => {
                body = value
                return res
            }),
        } as unknown as HttpResponse
        const issues = [
            { path: 'email', message: 'email must be an email address (was "x")' },
            { path: 'nested.name', message: 'nested.name must be at least length 2 (was 1)' },
        ]

        handleError(
            res,
            new ValidationError(
                issues.map((issue) => issue.message),
                undefined,
                issues,
            ),
        )

        expect(JSON.parse(body)).toMatchObject({
            code: 'validation_failed',
            details: {
                kind: 'validation',
                messages: issues.map((issue) => issue.message),
                issues,
            },
        })
    })
})
