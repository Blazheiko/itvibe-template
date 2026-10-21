import type { SessionData, SessionInfo } from "#vendor/types/types.js";
// import { DateTime } from 'luxon';
import redis, { withRedis } from "#database/redis.js";
import { RedisUnavailableError } from "#vendor/utils/network/errors/redis-unavailable-error.js";
import logger from "#vendor/utils/logger.js";
import { maskTokenForLogs } from "#vendor/utils/helpers/mask-sensitive.js";
import sessionConfig from "#config/session.js";
import redisConfig from "#config/redis.js";

/**
 * Normalizes userId to string format for protection against type coercion attacks
 * Duplicated here to avoid circular dependencies
 */
// const normalizeUserId = (
//     userId: string | bigint | number | undefined | null,
// ): string => {
//     if (userId === undefined || userId === null) return '0';

//     if (typeof userId === 'bigint' || typeof userId === 'number') {
//         return userId.toString();
//     }

//     if (typeof userId === 'string') {
//         const trimmed = userId.trim();
//         if (trimmed === '') return '0';

//         if (!/^\d+$/.test(trimmed)) {
//             logger.error(
//                 `Invalid userId format in redis-session-storage: ${userId}`,
//             );
//             throw new Error(
//                 `Invalid userId format: contains non-digit characters`,
//             );
//         }

//         return trimmed;
//     }

//     logger.error(
//         `Invalid userId type in redis-session-storage: ${typeof userId}`,
//     );
//     throw new Error(`Invalid userId type: ${typeof userId}`);
// };

/**
 * Sanitizes Redis keys for protection against injections
 */
const MAX_KEY_LENGTH = 86;
export const sanitizeRedisKey = (key: string | undefined | null): string => {
  if (
    key === undefined ||
    key === null ||
    key === "" ||
    key.length > MAX_KEY_LENGTH ||
    !/^[a-zA-Z0-9:_*-]+$/.test(key)
  ) {
    logger.error({ key }, `Invalid Redis key format`);
    throw new Error(`Invalid Redis key format`);
  }
  return key;
};

// Every command goes through withRedis: while Redis is down it fails fast with
// RedisUnavailableError, and the client neither queues nor resends commands, so
// a stale SETEX snapshot cannot overwrite a newer session after a reconnect.
// DEL is idempotent: a failed logout is simply repeated by the client.

export const saveSession = async (sessionInfo: SessionInfo): Promise<void> => {
  // Authenticated sessions use the user's nanoid token; anonymous sessions use shared prefix
  const userToken =
    typeof sessionInfo.data.userToken === "string"
      ? sessionInfo.data.userToken
      : "anon_session";
  const redisKey = sanitizeRedisKey(`session:${userToken}:${sessionInfo.id}`);

  const json = JSON.stringify(sessionInfo, (_, v: unknown) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  await withRedis(() => redis.setex(redisKey, sessionConfig.age, json));
};

export const getSession = async (
  sessionId: string | undefined,
  userToken: string,
): Promise<SessionInfo | null> => {
  if (sessionId === undefined) return null;

  const redisKey = sanitizeRedisKey(`session:${userToken}:${sessionId}`);

  const sessionJson = await withRedis(() =>
    redis.getex(redisKey, "EX", sessionConfig.age),
  );

  if (sessionJson === null) return null;

  try {
    return JSON.parse(sessionJson) as SessionInfo;
  } catch (e) {
    logger.error({ err: e }, "Failed to parse session JSON:");
  }
  return null;
};

export const updateSessionData = async (
  sessionId: string | undefined,
  newData: SessionData,
  userToken: string,
): Promise<SessionInfo | null> => {
  if (sessionId === undefined) return null;
  const session = await getSession(sessionId, userToken);
  if (session === null) return null;

  const updatedSession: SessionInfo = {
    ...session,
    data: { ...session.data, ...newData },
    updatedAt: new Date().toISOString(),
  };

  await saveSession(updatedSession);
  return updatedSession;
};

export const changeSessionData = async (
  sessionId: string | undefined,
  newData: SessionData,
  userToken: string,
): Promise<SessionInfo | null> => {
  if (sessionId === undefined) return null;
  const session = await getSession(sessionId, userToken);
  if (session === null) return null;

  const updatedSession: SessionInfo = {
    ...session,
    data: newData,
    updatedAt: new Date().toISOString(),
  };

  await saveSession(updatedSession);
  return updatedSession;
};

export const destroySession = async (
  sessionId: string | undefined,
  userToken: string,
): Promise<void> => {
  if (sessionId === undefined) return;
  const redisKey = sanitizeRedisKey(`session:${userToken}:${sessionId}`);
  await withRedis(() => redis.del(redisKey));
};

/**
 * Rejects when `promise` takes longer than `ms`. The command may still run on
 * the server; the callers below only use it for idempotent SCAN/DEL.
 */
const withTimer = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new RedisUnavailableError("logoutAll deadline exceeded"));
    }, ms);
  });
  try {
    return await Promise.race([promise, expired]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Deletes every session of the user. Resolves with the count only when SCAN
 * reached cursor 0; otherwise (deadline REDIS_LOGOUT_ALL_DEADLINE_MS exhausted,
 * Redis unavailable) rejects with RedisUnavailableError. Sessions deleted before
 * the stop stay deleted; a repeated call cleans up the rest.
 */
export const destroyAllSessions = async (
  userToken: string,
): Promise<number> => {
  const prefix = redisConfig.keyPrefix;
  const pattern = sanitizeRedisKey(`${prefix}session:${userToken}:*`);
  logger.info(
    { userToken: maskTokenForLogs(userToken) },
    "Destroying all sessions for userToken",
  );
  const deadline = Date.now() + redisConfig.logoutAllDeadlineMs;
  // Each await gets what is left of the budget, capped by the command timeout,
  // so the loop ends near the deadline, not deadline + one command timeout.
  const step = async <T>(op: () => Promise<T>): Promise<T> => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new RedisUnavailableError("logoutAll deadline exceeded");
    }
    return withTimer(
      withRedis(op),
      Math.min(remaining, redisConfig.commandTimeoutMs),
    );
  };

  // Use SCAN instead of KEYS for DoS protection
  // SCAN doesn't block Redis and is safe for production
  let cursor = "0";
  let deletedCount = 0;

  try {
    do {
      const [nextCursor, foundKeys] = await step(() =>
        redis.scan(cursor, "MATCH", pattern, "COUNT", 100),
      );
      cursor = nextCursor;
      if (foundKeys.length > 0) {
        // Remove the prefix from keys since redis.del will add it automatically
        const keysWithoutPrefix = removePrefixFromKeys(foundKeys, prefix);
        await step(() => redis.del(...keysWithoutPrefix));
        deletedCount += foundKeys.length;
      }
    } while (cursor !== "0");
  } catch (err: unknown) {
    if (err instanceof RedisUnavailableError) {
      logger.warn(
        { userToken: maskTokenForLogs(userToken), deletedCount },
        "Stopped deleting all sessions: Redis unavailable or deadline exceeded",
      );
    }
    throw err;
  }

  logger.info(
    { userToken: maskTokenForLogs(userToken), deletedCount },
    "Deleted all sessions for userToken",
  );

  return deletedCount;
};

const removePrefixFromKeys = (keys: string[], prefix: string): string[] => {
  return keys.map((key) =>
    key.startsWith(prefix) ? key.substring(prefix.length) : key,
  );
};

// export default () => ({ saveSession, getSession, updateSessionData, changeSessionData, destroySession });
