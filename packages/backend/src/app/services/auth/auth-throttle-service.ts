import redis from '#database/redis-rate-limit.js'
import type { ThrottlePolicy } from '#config/throttle-policies.js'

// Fixed window: PEXPIRE only on the first hit, so the window ends windowMs
// after the first attempt and rejected attempts never extend it.
const THROTTLE_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count
`

const throttleKey = (policy: ThrottlePolicy, key: string): string =>
    `auth:throttle:${policy.scope}:${key}`

/**
 * Atomically consumes one attempt. Throws on a Redis error or timeout; callers
 * treat that as a rejection (fail-closed). The command is never resent.
 */
export async function consumeAuthThrottle(
    policy: ThrottlePolicy,
    key: string,
): Promise<{ allowed: boolean; count: number }> {
    const count = Number(
        await redis.eval(THROTTLE_LUA, 1, throttleKey(policy, key), String(policy.windowMs)),
    )

    return {
        allowed: count <= policy.limit,
        count,
    }
}

/** Drops the counter after a successful operation (policies with resetOnSuccess). */
export async function resetAuthThrottle(policy: ThrottlePolicy, key: string): Promise<void> {
    await redis.del(throttleKey(policy, key))
}
