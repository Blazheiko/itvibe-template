import rateLimitConfig from "#config/rate-limit.js";
import logger from "#vendor/utils/logger.js";
import {
  clientKey,
  rateLimitStore,
  retryAfterSeconds,
} from "./rate-limit-store.js";

export type UpgradeRateLimitResult =
  | { kind: "allowed" }
  | { kind: "limited"; retryAfter: number }
  | { kind: "unavailable" };

/**
 * Per-IP budget for WebSocket upgrade requests, separate from the HTTP L1 budget.
 * Runs before the token check and the session lookup, so a flood costs no I/O.
 */
export default function checkUpgradeRateLimit(
  ip: string | null | undefined,
): UpgradeRateLimitResult {
  const { windowMs, max } = rateLimitConfig.wsUpgrade;
  if (max === 0) return { kind: "allowed" };
  try {
    const decision = rateLimitStore.consume(`upgrade:${clientKey(ip)}`, {
      windowMs,
      max,
    });
    if (decision.allowed) return { kind: "allowed" };
    logger.warn(
      { ip, limit: decision.limit, retryAfterMs: decision.retryAfterMs },
      "WebSocket upgrade rate limit exceeded",
    );
    return {
      kind: "limited",
      retryAfter: retryAfterSeconds(decision.retryAfterMs),
    };
  } catch (err) {
    logger.error({ err }, "WebSocket upgrade rate limit check failed");
    return { kind: "unavailable" };
  }
}
