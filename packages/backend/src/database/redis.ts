import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';
import config from '#config/redis.js';
import logger from '#logger';
import { createRedisHealth, createWithRedis } from '#database/redis-health.js';

// Main client: sessions and WS tokens. Fails fast instead of hanging while Redis
// is down: no offline queue (a command never runs later behind the caller's
// back), no resend after a dropped connection (an old SETEX snapshot must not
// overwrite a newer session), a command timeout, reconnects in the background.

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

const client = new Redis(mainRedisOptions);

/** Also the client's `error` listener: no "Unhandled error event" output. */
export const redisHealth = createRedisHealth(client, { logger });

export const withRedis = createWithRedis(client, redisHealth);

export default client;
