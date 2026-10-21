import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/composables/useWebSocketConnection', () => ({
    useWebSocketConnection: () => ({
        websocketApi: vi.fn(),
    }),
}))

vi.mock('../event-bus', () => ({
    useEventBus: () => ({
        emit: vi.fn(),
    }),
}))

describe('api.logoutAll', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    it('returns an error, not success, on 503 service_unavailable', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    status: 'error',
                    code: 'service_unavailable',
                    message: 'Service temporarily unavailable. Try again later.',
                }),
                {
                    status: 503,
                    headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
                },
            ),
        )
        const { authApi } = await import('../api')

        const result = await authApi.logoutAll()

        expect(result.error).toMatchObject({
            code: 'service_unavailable',
            transportCode: 503,
        })
    })
})
