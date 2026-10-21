/**
 * The main Redis client could not serve a command: not connected, timed out or
 * the connection dropped mid-command. Answered as 503 without the ioredis text;
 * the Sentry transport skips it (redis-health reports one event per incident).
 */
export class RedisUnavailableError extends Error {
  readonly name = "RedisUnavailableError";
  readonly code = "service_unavailable";
  readonly statusCode = 503;

  constructor(message = "Redis unavailable", options?: { cause?: unknown }) {
    super(message, options);
  }
}

// ioredis messages that mean "no answer from the server", not a bug in the
// command: commandTimeout, a dropped connection, a command while not ready with
// the offline queue disabled.
const UNAVAILABLE_MESSAGES = [
  "Command timed out",
  "Connection is closed",
  "Stream isn't writeable",
];
const UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
]);

/**
 * True for errors that mean Redis is unreachable. Reply errors (WRONGTYPE, Lua
 * script errors) and programming errors are bugs and stay false.
 */
export const isRedisUnavailable = (err: unknown): boolean => {
  if (err instanceof RedisUnavailableError) return true;
  if (!(err instanceof Error)) return false;
  if (err.name === "MaxRetriesPerRequestError") return true;
  if (err.name === "ReplyError") return false;
  const code = (err as { code?: unknown }).code;
  if (typeof code === "string" && UNAVAILABLE_CODES.has(code)) return true;
  return UNAVAILABLE_MESSAGES.some((text) => err.message.startsWith(text));
};
