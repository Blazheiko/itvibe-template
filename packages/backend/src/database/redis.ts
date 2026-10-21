import { Redis } from 'ioredis';
import logger from '#logger';
import { createRedisHealth, createWithRedis } from '#database/redis-health.js';
import { mainRedisOptions } from '#database/redis-main-options.js';

export { mainRedisOptions };

const client = new Redis(mainRedisOptions);

/** Also the client's `error` listener: no "Unhandled error event" output. */
export const redisHealth = createRedisHealth(client, { logger });

export const withRedis = createWithRedis(client, redisHealth);

export default client;
