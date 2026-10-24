import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
    cleanupTestRedis,
    createTestRedis,
    hasRedis,
} from '../../../test-support/redis-test-client.js'

// Fallback -> recovery for WS upgrade level 2 with a real connection that is
// forcibly dropped (reconnect off) and brought back.
const { holder } = vi.hoisted((): { holder: { client: unknown } } => ({
    holder: { client: null },
}))
vi.mock('#database/redis-rate-limit.js', () => ({
    get default() {
        return holder.client
    },
}))
vi.mock('#config/rate-limit.js', () => ({
    default: {
        httpGlobal: { windowMs: 60_000, max: 100 },
        wsUpgrade: { windowMs: 60_000, max: 4 },
        redisTimeoutMs: 50,
        configError: null,
    },
}))
vi.mock('#config/throttle-policies.js', () => ({
    throttlePolicies: {
        wsUpgradeShared: { scope: 'upgrade', limit: 3, windowMs: 60_000 },
    },
}))

const client = createTestRedis()
// Same strict contract as the production client: no queue, no retry.
client.options.enableOfflineQueue = false
client.options.maxRetriesPerRequest = 0
holder.client = client

const mod = await import('./upgrade-rate-limit.js')
const level1 = mod.default
const level2 = mod.checkUpgradeRateLimitShared

const upgrade = async (ip: string): Promise<string> => {
    const local = level1(ip)
    if (local.kind !== 'allowed') return `level1:${local.kind}`
    const shared = await level2(ip)
    return shared.kind === 'allowed' ? 'allowed' : `level2:${shared.kind}`
}

beforeAll(async () => {
    if (hasRedis) await client.connect()
})
afterAll(async () => {
    if (!hasRedis) return
    if (client.status === 'end') await client.connect()
    await cleanupTestRedis(client)
    await client.quit()
})

describe.skipIf(!hasRedis)('WS upgrade level 2: fallback and recovery', () => {
    it('skips level 2 while the connection is down and continues from Redis state after', async () => {
        const ip = '10.9.0.1'
        // Two upgrades counted in Redis (level 2 budget is 3).
        expect(await upgrade(ip)).toBe('allowed')
        expect(await upgrade(ip)).toBe('allowed')

        const ended = new Promise((resolve) => client.once('end', resolve))
        client.disconnect(false)
        await ended
        // Level 2 is skipped; level 1 (budget 4) still counts each upgrade once.
        expect(await upgrade(ip)).toBe('allowed')
        expect(await upgrade(ip)).toBe('allowed')
        expect(await upgrade(ip)).toBe('level1:limited')

        await client.connect()
        // Locally admitted upgrades never reached Redis: its counter is still 2.
        expect(await client.zcard(`rl:upgrade:${ip}`)).toBe(2)
        const otherIp = '10.9.0.2'
        expect(await upgrade(otherIp)).toBe('allowed')
        expect(await upgrade(otherIp)).toBe('allowed')
        expect(await upgrade(otherIp)).toBe('allowed')
        expect(await upgrade(otherIp)).toBe('level2:limited')
    })
})
