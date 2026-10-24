import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ThrottlePolicy } from '#config/throttle-policies.js'
import {
    cleanupTestRedis,
    createTestRedis,
    hasRedis,
    sleep,
} from '../../../test-support/redis-test-client.js'

const { redis } = vi.hoisted((): { redis: { client: unknown } } => ({
    redis: { client: null },
}))
vi.mock('#database/redis-rate-limit.js', () => ({
    get default() {
        return redis.client
    },
}))

const client = createTestRedis()
redis.client = client

const { consumeAuthThrottle, resetAuthThrottle } = await import('./auth-throttle-service.js')

const policy = (limit: number, windowMs: number, scope = 'it'): ThrottlePolicy => ({
    scope,
    keyBy: 'ip',
    algorithm: 'fixed-window',
    limit,
    windowMs,
    onRedisError: 'reject',
})

beforeAll(async () => {
    if (hasRedis) await client.connect()
})
afterAll(async () => {
    if (!hasRedis) return
    await cleanupTestRedis(client)
    await client.quit()
})

describe.skipIf(!hasRedis)('consumeAuthThrottle against Redis', () => {
    it('writes auth:throttle:<scope>:<key> with a PTTL inside the window', async () => {
        await consumeAuthThrottle(policy(3, 60_000, 'ttl'), '10.0.0.1')
        const ttl = await client.pttl('auth:throttle:ttl:10.0.0.1')
        expect(ttl).toBeGreaterThan(60_000 - 1_000)
        expect(ttl).toBeLessThanOrEqual(60_000)
    })

    it('repeated rejections do not extend the window', async () => {
        const p = policy(1, 60_000, 'fixed')
        await consumeAuthThrottle(p, 'k')
        const first = await client.pttl('auth:throttle:fixed:k')
        await sleep(50)
        for (let i = 0; i < 5; i++) {
            expect((await consumeAuthThrottle(p, 'k')).allowed).toBe(false)
        }
        expect(await client.pttl('auth:throttle:fixed:k')).toBeLessThanOrEqual(first)
    })

    it('N >= M concurrent attempts admit exactly M (no successes, no resets)', async () => {
        const p = policy(7, 60_000, 'burst')
        const results = await Promise.all(
            Array.from({ length: 40 }, () => consumeAuthThrottle(p, 'k')),
        )
        expect(results.filter((r) => r.allowed)).toHaveLength(7)
    })

    it('restores the budget after the window', async () => {
        const p = policy(1, 300, 'window')
        expect((await consumeAuthThrottle(p, 'k')).allowed).toBe(true)
        expect((await consumeAuthThrottle(p, 'k')).allowed).toBe(false)
        await sleep(350)
        expect((await consumeAuthThrottle(p, 'k')).allowed).toBe(true)
    })

    it('resetAuthThrottle removes the key', async () => {
        const p = policy(1, 60_000, 'reset')
        await consumeAuthThrottle(p, 'k')
        await resetAuthThrottle(p, 'k')
        expect(await client.exists('auth:throttle:reset:k')).toBe(0)
        expect((await consumeAuthThrottle(p, 'k')).allowed).toBe(true)
    })
})
