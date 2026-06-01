import { beforeEach, describe, expect, it, vi } from 'vitest'

const emitMock = vi.hoisted(() => vi.fn())
const CSRF_TOKEN = 'a'.repeat(43)
const NEXT_CSRF_TOKEN = 'b'.repeat(43)
const FRESH_CSRF_TOKEN = 'c'.repeat(43)

vi.mock('@/composables/useWebSocketConnection', () => ({
    useWebSocketConnection: () => ({
        websocketApi: vi.fn(),
    }),
}))

vi.mock('../event-bus', () => ({
    useEventBus: () => ({
        emit: emitMock,
    }),
}))

const jsonResponse = (payload: unknown, status = 200): Response =>
    new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

describe('base-api CSRF headers', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
        document.head.innerHTML = `<meta name="csrf-token" content="${CSRF_TOKEN}">`
        globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ status: 'success' }))
    })

    it('adds X-CSRF-Token to unsafe JSON requests', async () => {
        const api = (await import('../base-api')).default

        await api.http('POST', '/api/test', { value: 1 })

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/test'),
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': CSRF_TOKEN,
                }),
            }),
        )
    })

    it('does not add X-CSRF-Token to GET requests', async () => {
        const api = (await import('../base-api')).default

        await api.http('GET', '/api/test')

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/test'),
            expect.objectContaining({
                headers: expect.not.objectContaining({
                    'X-CSRF-Token': expect.any(String),
                }),
            }),
        )
    })

    it('adds X-CSRF-Token to uploads without overwriting multipart Content-Type', async () => {
        const api = (await import('../base-api')).default
        const formData = new FormData()
        formData.append('file', new Blob(['hello']), 'hello.txt')

        await api.upload('POST', '/api/upload', formData)

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/upload'),
            expect.objectContaining({
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    'X-CSRF-Token': CSRF_TOKEN,
                },
            }),
        )
    })

    it('refreshes token from successful API responses', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            jsonResponse({
                status: 'success',
                csrfToken: NEXT_CSRF_TOKEN,
            }),
        )
        const api = (await import('../base-api')).default

        await api.http('POST', '/api/test')
        await api.http('POST', '/api/next')

        expect(fetch).toHaveBeenLastCalledWith(
            expect.stringContaining('/api/next'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'X-CSRF-Token': NEXT_CSRF_TOKEN,
                }),
            }),
        )
    })

    it('caps repeated csrf_invalid bootstrap refresh requests until a fresh token arrives', async () => {
        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse(
                    {
                        status: 'error',
                        code: 'csrf_invalid',
                        message: 'Invalid CSRF token',
                    },
                    403,
                ),
            )
            .mockResolvedValueOnce(
                jsonResponse(
                    {
                        status: 'error',
                        code: 'csrf_invalid',
                        message: 'Invalid CSRF token',
                    },
                    403,
                ),
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    status: 'success',
                    csrfToken: FRESH_CSRF_TOKEN,
                }),
            )
            .mockResolvedValueOnce(
                jsonResponse(
                    {
                        status: 'error',
                        code: 'csrf_invalid',
                        message: 'Invalid CSRF token',
                    },
                    403,
                ),
            )
        const api = (await import('../base-api')).default

        await api.http('POST', '/api/test')
        await api.http('POST', '/api/test')
        await api.http('POST', '/api/test')
        await api.http('POST', '/api/test')

        expect(emitMock).toHaveBeenCalledTimes(2)
        expect(emitMock).toHaveBeenNthCalledWith(1, 'init_app')
        expect(emitMock).toHaveBeenNthCalledWith(2, 'init_app')
    })
})
