import { afterEach, describe, expect, it, vi } from 'vitest'

const completeBySocketUuid = vi.fn()
const warn = vi.fn()
vi.mock('#app/repositories/index.js', () => ({
    userOnlineRepository: { completeBySocketUuid, create: vi.fn() },
}))
vi.mock('#vendor/utils/logger.js', () => ({
    default: { warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const { userOnlineService } = await import('./user-online-service.js')

const input = {
    socketUuid: 'sock-1',
    disconnectedAt: new Date(0),
    closeCode: 1000,
    connectionDurationMs: 5,
    isLastConnection: true,
}

afterEach(() => {
    vi.clearAllMocks()
})

describe('userOnlineService.trackDisconnected', () => {
    it('warns when no user_online record matches the socket (moved from the repository)', async () => {
        completeBySocketUuid.mockResolvedValue(false)

        await userOnlineService.trackDisconnected(input)

        expect(warn).toHaveBeenCalledWith(
            { socketUuid: 'sock-1' },
            'user_online: no record found on disconnect',
        )
    })

    it('stays quiet when the record was completed', async () => {
        completeBySocketUuid.mockResolvedValue(true)

        await userOnlineService.trackDisconnected(input)

        expect(warn).not.toHaveBeenCalled()
    })
})
