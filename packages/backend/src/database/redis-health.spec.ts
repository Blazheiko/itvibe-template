import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RedisUnavailableError } from '#vendor/utils/network/errors/redis-unavailable-error.js'
import { createRedisHealth, createWithRedis } from './redis-health.js'

class FakeClient extends EventEmitter {
    status = 'ready'
    ping = vi.fn(() => Promise.resolve('PONG'))
}

const createLogger = () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })

let client: FakeClient
let logger: ReturnType<typeof createLogger>

beforeEach(() => {
    vi.useFakeTimers()
    client = new FakeClient()
    logger = createLogger()
})
afterEach(() => {
    vi.useRealTimers()
})

const create = () => createRedisHealth(client, { logger, now: () => Date.now() })

describe('redis-health', () => {
    it('logs one error-level event with sentryCapture per incident', () => {
        const health = create()
        client.emit('error', new Error('connect ECONNREFUSED'))
        client.emit('close')
        health.markUnavailable(new Error('Command timed out'))

        expect(health.state).toBe('unavailable')
        expect(logger.error).toHaveBeenCalledTimes(1)
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ sentryCapture: true }),
            'Redis unavailable',
        )
        // No `err`: the Sentry transport sends the message, not an exception.
        expect(logger.error.mock.calls[0]?.[0]).not.toHaveProperty('err')
        health.stop()
    })

    it('warns about a lasting incident at most once a minute', () => {
        client.ping.mockRejectedValue(new Error('Command timed out'))
        const health = create()
        health.markUnavailable()

        vi.advanceTimersByTime(59_000)
        health.markUnavailable()
        expect(logger.warn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(2_000) // 61 s after the incident started
        health.markUnavailable()
        expect(logger.warn).toHaveBeenCalledTimes(1)

        health.markUnavailable()
        expect(logger.warn).toHaveBeenCalledTimes(1)
        health.stop()
    })

    it('pings every 2 s only while unavailable', async () => {
        client.ping.mockRejectedValue(new Error('Command timed out'))
        const health = create()

        await vi.advanceTimersByTimeAsync(10_000)
        expect(client.ping).not.toHaveBeenCalled()

        health.markUnavailable()
        await vi.advanceTimersByTimeAsync(1_999)
        expect(client.ping).toHaveBeenCalledTimes(0)
        await vi.advanceTimersByTimeAsync(1)
        expect(client.ping).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(4_000)
        expect(client.ping).toHaveBeenCalledTimes(3)
        health.stop()
    })

    it.each([
        [
            'a successful command',
            (h: ReturnType<typeof create>) => {
                h.markHealthy()
            },
        ],
        ['the ready event', () => client.emit('ready')],
    ])('recovers on %s and stops the timer', async (_, signal) => {
        const health = create()
        vi.advanceTimersByTime(500)
        health.markUnavailable()
        vi.advanceTimersByTime(1_500)

        signal(health)

        expect(health.state).toBe('healthy')
        expect(logger.info).toHaveBeenCalledWith({ downMs: 1_500 }, 'Redis recovered')
        await vi.advanceTimersByTimeAsync(10_000)
        expect(client.ping).not.toHaveBeenCalled()
    })

    it('recovers on a successful background PING and stops the timer', async () => {
        const health = create()
        health.markUnavailable()

        await vi.advanceTimersByTimeAsync(2_000)

        expect(client.ping).toHaveBeenCalledTimes(1)
        expect(health.state).toBe('healthy')
        expect(logger.info).toHaveBeenCalledWith({ downMs: 2_000 }, 'Redis recovered')
        await vi.advanceTimersByTimeAsync(10_000)
        expect(client.ping).toHaveBeenCalledTimes(1)
    })

    it('reports a new incident after recovery', () => {
        const health = create()
        health.markUnavailable()
        health.markHealthy()
        health.markUnavailable()
        expect(logger.error).toHaveBeenCalledTimes(2)
        health.stop()
    })

    it('stop() clears the timer and ignores later events', async () => {
        const health = create()
        health.markUnavailable()
        health.stop()
        client.emit('close')
        client.emit('ready')

        await vi.advanceTimersByTimeAsync(10_000)
        expect(client.ping).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
        expect(logger.info).not.toHaveBeenCalled()
    })
})

describe('withRedis', () => {
    const createHealth = () => ({
        state: 'healthy' as const,
        markUnavailable: vi.fn(),
        markHealthy: vi.fn(),
        stop: vi.fn(),
    })

    it('fails fast without calling the operation when not ready', async () => {
        const health = createHealth()
        const op = vi.fn(() => Promise.resolve('x'))
        const withRedis = createWithRedis({ status: 'reconnecting' }, health)

        await expect(withRedis(op)).rejects.toBeInstanceOf(RedisUnavailableError)
        expect(op).not.toHaveBeenCalled()
        expect(health.markUnavailable).toHaveBeenCalledTimes(1)
    })

    it('wraps an unavailability error and marks the client unavailable', async () => {
        const health = createHealth()
        const cause = new Error('Command timed out')
        const withRedis = createWithRedis({ status: 'ready' }, health)

        const err: unknown = await withRedis(() => Promise.reject(cause)).catch((e: unknown) => e)

        expect(err).toBeInstanceOf(RedisUnavailableError)
        expect((err as Error).cause).toBe(cause)
        expect(health.markUnavailable).toHaveBeenCalledWith(cause)
    })

    it('marks the client healthy on success', async () => {
        const health = createHealth()
        const withRedis = createWithRedis({ status: 'ready' }, health)

        await expect(withRedis(() => Promise.resolve(42))).resolves.toBe(42)
        expect(health.markHealthy).toHaveBeenCalledTimes(1)
    })

    it('rethrows other errors as they are', async () => {
        const health = createHealth()
        const bug = Object.assign(new Error('WRONGTYPE Operation'), {
            name: 'ReplyError',
        })
        const withRedis = createWithRedis({ status: 'ready' }, health)

        await expect(withRedis(() => Promise.reject(bug))).rejects.toBe(bug)
        expect(health.markUnavailable).not.toHaveBeenCalled()
        expect(health.markHealthy).not.toHaveBeenCalled()
    })
})
