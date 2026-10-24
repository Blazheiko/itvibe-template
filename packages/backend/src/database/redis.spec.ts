import { describe, expect, it, vi } from 'vitest'

const constructed: unknown[] = []
const events: string[] = []

vi.mock('ioredis', () => ({
    Redis: vi.fn(function (this: unknown, options: unknown) {
        constructed.push(options)
        return {
            status: 'connecting',
            on: (event: string) => {
                events.push(event)
            },
            ping: vi.fn(),
        }
    }),
}))
vi.mock('#logger', () => ({
    default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

const { mainRedisOptions } = await import('./redis.js')

describe('main Redis client', () => {
    it('fails fast: no offline queue, no resend, command timeout', () => {
        expect(constructed).toHaveLength(1)
        expect(constructed[0]).toMatchObject({
            enableOfflineQueue: false,
            autoResendUnfulfilledCommands: false,
            maxRetriesPerRequest: 0,
            commandTimeout: 500,
        })
        expect(constructed[0]).not.toHaveProperty('commandTimeoutMs')
        expect(constructed[0]).not.toHaveProperty('configError')
    })

    it('reconnects in the background with a capped delay', () => {
        expect(mainRedisOptions.retryStrategy(1)).toBe(100)
        expect(mainRedisOptions.retryStrategy(5)).toBe(500)
        expect(mainRedisOptions.retryStrategy(100)).toBe(2000)
    })

    it("handles error events (no 'Unhandled error event' output)", () => {
        expect(events).toEqual(expect.arrayContaining(['error', 'close', 'ready']))
    })
})
