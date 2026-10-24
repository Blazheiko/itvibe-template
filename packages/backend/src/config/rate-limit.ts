import { env } from 'node:process'

export interface RateLimitSettings {
    windowMs: number
    /** 0 disables the limit. */
    max: number
}

const INTEGER = /^\d+$/

const readInteger = (name: string, fallback: number, min: number, errors: string[]): number => {
    const raw = env[name]
    if (raw === undefined) return fallback
    const value = raw.trim()
    const parsed = Number(value)
    if (!INTEGER.test(value) || !Number.isSafeInteger(parsed) || parsed < min) {
        errors.push(`${name} must be an integer >= ${String(min)}, got "${raw}"`)
        return fallback
    }
    return parsed
}

const read = (
    prefix: string,
    defaults: RateLimitSettings,
    errors: string[],
): RateLimitSettings => ({
    windowMs: readInteger(`${prefix}_WINDOW_MS`, defaults.windowMs, 1, errors),
    max: readInteger(`${prefix}_MAX`, defaults.max, 0, errors),
})

const errors: string[] = []

const rateLimitConfig = Object.freeze({
    /** L1: every API request from one IP (fixed window). */
    httpGlobal: read('HTTP_GLOBAL_RATE_LIMIT', { windowMs: 60_000, max: 600 }, errors),
    /**
     * WebSocket upgrade level 1: per-process flood filter before any I/O
     * (sliding log). The cluster-wide budget is wsUpgradeShared in throttle-policies.
     */
    wsUpgrade: read('WS_UPGRADE_RATE_LIMIT', { windowMs: 60_000, max: 120 }, errors),
    /** Command timeout of the dedicated Redis connection for shared limits. */
    redisTimeoutMs: readInteger('RATE_LIMIT_REDIS_TIMEOUT_MS', 50, 1, errors),
    configError: errors.length > 0 ? errors.join('; ') : null,
})

export default rateLimitConfig
