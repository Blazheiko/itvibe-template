import type { RedisOptions } from 'ioredis';
import config from '#config/redis.js';

// Main client (sessions, WS tokens): fails fast instead of hanging while Redis
// is down. No offline queue (a command never runs later behind the caller's
// back), no resend after a dropped connection (an old SETEX snapshot must not
// overwrite a newer session), a command timeout, reconnects in the background.
// A module of its own so integration tests can use the contract without the
// connection that #database/redis.js opens on import.

const MAX_RECONNECT_DELAY_MS = 2_000;

const { host, port, keyPrefix, password } = config;

// `satisfies` (not an annotation): ioredis 6 constructor types reject an object
// typed as RedisOptions under exactOptionalPropertyTypes (optional `replyMapping`).
export const mainRedisOptions = {
    host,
    port,
    keyPrefix,
    ...(password !== null ? { password } : {}),
    enableOfflineQueue: false,
    autoResendUnfulfilledCommands: false,
    maxRetriesPerRequest: 0,
    commandTimeout: config.commandTimeoutMs,
    retryStrategy: (times: number): number => Math.min(times * 100, MAX_RECONNECT_DELAY_MS),
} satisfies RedisOptions;
