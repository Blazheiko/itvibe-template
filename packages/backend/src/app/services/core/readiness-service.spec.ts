import { afterEach, describe, expect, it, vi } from 'vitest'

// GET /ready (code-issues item 35): both PostgreSQL and Redis must answer within
// READINESS_CHECK_TIMEOUT_MS; the response never names what failed.
const pingDatabase = vi.fn()
vi.mock('#app/repositories/index.js', () => ({ healthRepository: { pingDatabase } }))
const redisPing = vi.fn()
vi.mock('#database/redis.js', () => ({ default: { ping: redisPing } }))
vi.mock('#config/health.js', () => ({ default: { readinessTimeoutMs: 50, configError: null } }))
const warn = vi.fn()
vi.mock('#logger', () => ({ default: { warn, info: vi.fn(), error: vi.fn() } }))

const { readinessService } = await import('./readiness-service.js')

afterEach(() => {
    vi.clearAllMocks()
})

const never = () => new Promise(() => {})

describe('readinessService.check', () => {
    it('is ready when both dependencies answer', async () => {
        pingDatabase.mockResolvedValue(undefined)
        redisPing.mockResolvedValue('PONG')
        expect(await readinessService.check()).toEqual({ ready: true })
        expect(warn).not.toHaveBeenCalled()
    })

    it.each([
        [
            'database fails',
            () => Promise.reject(new Error('ECONNREFUSED')),
            () => Promise.resolve('PONG'),
            'database',
        ],
        ['redis fails', () => Promise.resolve(), () => Promise.reject(new Error('down')), 'redis'],
        ['database hangs', never, () => Promise.resolve('PONG'), 'database'],
        ['redis hangs', () => Promise.resolve(), never, 'redis'],
    ])('is not ready when %s, within the timeout', async (_name, db, redis, failed) => {
        pingDatabase.mockImplementation(db)
        redisPing.mockImplementation(redis)
        const started = Date.now()

        expect(await readinessService.check()).toEqual({ ready: false })

        expect(Date.now() - started).toBeLessThan(500)
        expect(warn).toHaveBeenCalledWith(
            expect.objectContaining({ failed: [failed] }),
            'Readiness check failed',
        )
    })
})
