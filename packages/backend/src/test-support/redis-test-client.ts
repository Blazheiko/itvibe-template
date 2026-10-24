import { randomUUID } from 'node:crypto'
import { Redis } from 'ioredis'

// Helpers for *.redis.test.ts. Each file gets its own key prefix and removes
// its keys afterwards, so suites never see each other's counters.

export const REDIS_TEST_URL = process.env['REDIS_TEST_URL']
export const hasRedis = REDIS_TEST_URL !== undefined && REDIS_TEST_URL !== ''

export const createTestRedis = (prefix = `test:${randomUUID()}:`): Redis =>
    new Redis(REDIS_TEST_URL ?? 'redis://127.0.0.1:6379', {
        keyPrefix: prefix,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
    })

export const cleanupTestRedis = async (client: Redis): Promise<void> => {
    const prefix = client.options.keyPrefix ?? ''
    if (prefix === '') throw new Error('refusing to clean up without a key prefix')
    let cursor = '0'
    do {
        // SCAN ignores keyPrefix, so match the full key; DEL adds the prefix itself.
        const [next, keys] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 500)
        cursor = next
        if (keys.length > 0) await client.del(...keys.map((key) => key.slice(prefix.length)))
    } while (cursor !== '0')
}

export const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms))
