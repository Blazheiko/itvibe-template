import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';
import config from '#config/redis.js';

const { password, ...baseConfig } = config;

// `satisfies` (not an annotation): ioredis 6 constructor types reject an object
// typed as RedisOptions under exactOptionalPropertyTypes (optional `replyMapping`).
const redisConfig = {
    ...baseConfig,
    ...(password !== null ? { password } : {}),
} satisfies RedisOptions;

export default new Redis(redisConfig);
