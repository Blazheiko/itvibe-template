import { Redis } from "ioredis";
import type { RedisOptions } from "ioredis";
import config from "#config/redis.js";
import rateLimitConfig from "#config/rate-limit.js";
import logger from "#logger";

// Second connection to the same Redis server, used only by shared rate limits.
// ioredis sets timeouts, the offline queue and command resend per client, and
// limits need the strict variant: a fast error instead of a hanging request,
// and no resend (a Lua script may already have consumed quota). Sessions keep
// the tolerant main client in #database/redis.js.

const ERROR_LOG_INTERVAL_MS = 60_000;
const MAX_RECONNECT_DELAY_MS = 2_000;

const { host, port, keyPrefix, password } = config;
const baseConfig = { host, port, keyPrefix };

export const rateLimitRedisOptions = {
  ...baseConfig,
  ...(password !== null ? { password } : {}),
  // Connected explicitly at startup (connectRateLimitRedis), so importing this
  // module, e.g. in unit tests, opens no socket.
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 0,
  autoResendUnfulfilledCommands: false,
  commandTimeout: rateLimitConfig.redisTimeoutMs,
  retryStrategy: (times: number): number =>
    Math.min(times * 200, MAX_RECONNECT_DELAY_MS),
} satisfies RedisOptions;

const client = new Redis(rateLimitRedisOptions);

let lastErrorLog = Number.NEGATIVE_INFINITY;
client.on("error", (err: unknown) => {
  const now = Date.now();
  if (now - lastErrorLog < ERROR_LOG_INTERVAL_MS) return;
  lastErrorLog = now;
  logger.warn({ err }, "Rate-limit Redis connection error");
});

/**
 * Opens the connection without blocking startup: until it is ready, commands
 * fail fast and callers apply their onRedisError policy. Reconnects follow
 * retryStrategy.
 */
export const connectRateLimitRedis = (): void => {
  client.connect().catch((err: unknown) => {
    logger.warn({ err }, "Rate-limit Redis initial connection failed");
  });
};

/** Test-only: drop the connection and keep it down until reconnect() is called. */
export const __rateLimitRedisTestHooks = {
  forceDisconnect(): void {
    client.disconnect(false);
  },
  reconnect(): Promise<void> {
    return client.connect();
  },
} as const;

export default client;
