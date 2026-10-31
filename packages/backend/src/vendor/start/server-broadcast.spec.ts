import { beforeEach, describe, expect, it, vi } from 'vitest'

const publish = vi.fn()
vi.mock('uWebSockets.js', () => ({
    App: () => ({ publish }),
}))

const warn = vi.fn()
vi.mock('#vendor/utils/logger.js', () => ({
    default: { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('#app/routes/http-routes.js', () => ({ default: [] }))
vi.mock('#app/routes/ws-routes.js', () => ({ default: [] }))
vi.mock('#vendor/utils/network/ws-handlers.js', () => ({
    onMessage: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    handleUpgrade: vi.fn(),
    closeAllWs: vi.fn(),
}))
// Keeps the session middleware chain (and token-handler's APP_KEY check) out of the import.
vi.mock('#vendor/utils/middlewares/core/execute-httpMiddlewares.js', () => ({
    default: vi.fn().mockResolvedValue(true),
}))
vi.mock('#vendor/start/static-server.js', () => ({
    cacheStaticSource: vi.fn().mockResolvedValue(null),
    staticHandler: vi.fn(),
    staticCacheHandler: vi.fn(),
}))

const { broadcastToChannel } = await import('./server.js')

beforeEach(() => {
    publish.mockClear()
    warn.mockClear()
})

describe('broadcastToChannel', () => {
    it('publishes to a declared channel', () => {
        expect(broadcastToChannel('admin', 'admin_user_online_remove', '{}')).toBe(true)
        expect(publish).toHaveBeenCalledTimes(1)
        expect(publish.mock.calls[0]?.[0]).toBe('admin')
        expect(warn).not.toHaveBeenCalled()
    })

    it.each(['user:1', 'admin#', '*', ''])(
        'drops a message for an undeclared channel %j that bypassed the type',
        (channel) => {
            // Simulates an untyped value reaching the function at runtime.
            const result = broadcastToChannel(channel as 'admin', 'event', '{}')
            expect(result).toBe(false)
            expect(publish).not.toHaveBeenCalled()
            expect(warn).toHaveBeenCalledTimes(1)
        },
    )
})
