import rateLimitConfig from '#config/rate-limit.js'
import { throttlePolicies } from '#config/throttle-policies.js'
import rateLimitRedis from '#database/redis-rate-limit.js'
import logger from '#vendor/utils/logger.js'
import { consumeRedisSlidingLog, slidingLogKey } from './redis-sliding-log.js'
import { clientKey, rateLimitStore, retryAfterSeconds } from './rate-limit-store.js'

export type UpgradeRateLimitResult =
    { kind: 'allowed' } | { kind: 'limited'; retryAfter: number } | { kind: 'unavailable' }

/**
 * Level 1: per-process, per-IP budget for WebSocket upgrade requests, separate
 * from the HTTP L1 budget. Synchronous and runs before any I/O, so a flood
 * costs nothing.
 */
export default function checkUpgradeRateLimit(
    ip: string | null | undefined,
): UpgradeRateLimitResult {
    const { windowMs, max } = rateLimitConfig.wsUpgrade
    if (max === 0) return { kind: 'allowed' }
    try {
        const decision = rateLimitStore.consume(`upgrade:${clientKey(ip)}`, {
            windowMs,
            max,
        })
        if (decision.allowed) return { kind: 'allowed' }
        logger.warn(
            { ip, limit: decision.limit, retryAfterMs: decision.retryAfterMs },
            'WebSocket upgrade rate limit exceeded',
        )
        return {
            kind: 'limited',
            retryAfter: retryAfterSeconds(decision.retryAfterMs),
        }
    } catch (err) {
        logger.error({ err }, 'WebSocket upgrade rate limit check failed')
        return { kind: 'unavailable' }
    }
}

const REDIS_ERROR_LOG_INTERVAL_MS = 60_000
let lastRedisErrorLog = Number.NEGATIVE_INFINITY

/**
 * Level 2: cluster-wide per-IP budget in Redis, checked after level 1 passed.
 * On a Redis error the check is skipped (onRedisError: "skip"): level 1 has
 * already consumed this upgrade's local attempt, so nothing is consumed twice.
 */
export async function checkUpgradeRateLimitShared(
    ip: string | null | undefined,
): Promise<UpgradeRateLimitResult> {
    const policy = throttlePolicies.wsUpgradeShared
    if (policy.limit === 0) return { kind: 'allowed' }
    try {
        const decision = await consumeRedisSlidingLog(
            rateLimitRedis,
            slidingLogKey(policy.scope, clientKey(ip)),
            { windowMs: policy.windowMs, max: policy.limit },
        )
        if (decision.allowed) return { kind: 'allowed' }
        logger.warn(
            { ip, limit: decision.limit, retryAfterMs: decision.retryAfterMs },
            'WebSocket upgrade shared rate limit exceeded',
        )
        return {
            kind: 'limited',
            retryAfter: retryAfterSeconds(decision.retryAfterMs),
        }
    } catch (err) {
        const now = Date.now()
        if (now - lastRedisErrorLog >= REDIS_ERROR_LOG_INTERVAL_MS) {
            lastRedisErrorLog = now
            logger.warn(
                { err },
                'WebSocket upgrade shared rate limit unavailable, relying on the local limit',
            )
        }
        return { kind: 'allowed' }
    }
}
