import { useIntervalFn } from '@vueuse/core'
import type { UseWebSocketOptions } from '@vueuse/core'

export const HEARTBEAT_INTERVAL_MS = 10_000
export const HEARTBEAT_PONG_TIMEOUT_MS = 5_000

/**
 * Heartbeat for useWebSocket: `ping` every 10s, close if no `pong` within 5s.
 *
 * @vueuse/core 15 replaced `interval` with a scheduler. The interval must not
 * start on its own (`immediate: false`): useWebSocket resumes it on connect.
 * Otherwise it ticks from module load and its pong timeout can close a socket
 * that is still in its handshake.
 */
export function createHeartbeatOptions(): NonNullable<UseWebSocketOptions['heartbeat']> {
    return {
        message: 'ping',
        responseMessage: 'pong',
        scheduler: (cb) => useIntervalFn(cb, HEARTBEAT_INTERVAL_MS, { immediate: false }),
        pongTimeout: HEARTBEAT_PONG_TIMEOUT_MS,
    }
}
