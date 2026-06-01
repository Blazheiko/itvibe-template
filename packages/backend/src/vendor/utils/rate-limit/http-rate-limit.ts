import type {
  RateLimit,
  ResponseData,
  RouteItem,
} from "#vendor/types/types.js";
import logger from "#vendor/utils/logger.js";
import {
  updateRateLimitCounter,
  getRateLimitKey,
  getClientIdentifier,
  logRateLimitInfo,
} from "./rate-limit-counter.js";

function determineRateLimit(
  route: RouteItem,
  groupRateLimit?: RateLimit,
): RateLimit | null {
  // Route limits override group limits
  if (route.rateLimit !== undefined) {
    return route.rateLimit;
  }

  if (groupRateLimit !== undefined) {
    return groupRateLimit;
  }

  return null;
}

export default function checkRateLimit(
  ip: string | null | undefined,
  responseData: ResponseData,
  route: RouteItem,
  groupRateLimit?: RateLimit,
): boolean {
  try {
    const rateLimit = determineRateLimit(route, groupRateLimit);

    if (rateLimit === null) {
      return true;
    }

    const clientId = getClientIdentifier(
      ip !== null && ip !== undefined && ip !== "" ? ip : "unknown",
    );
    const routeKey = getRateLimitKey(clientId, route.url);

    logger.debug(
      {
        windowMs: rateLimit.windowMs,
        maxRequests: rateLimit.maxRequests,
      },
      `Checking rate limit for ${routeKey}`,
    );

    const rateLimitInfo = updateRateLimitCounter(routeKey, rateLimit.windowMs);
    rateLimitInfo.maxRequests = rateLimit.maxRequests;

    // Add headers with limit information
    responseData.setHeader(
      "X-RateLimit-Limit",
      rateLimit.maxRequests.toString(),
    );
    responseData.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, rateLimit.maxRequests - rateLimitInfo.requests).toString(),
    );
    responseData.setHeader(
      "X-RateLimit-Reset",
      Math.ceil(rateLimitInfo.resetTime / 1000).toString(),
    );

    // Check limit exceeded
    if (rateLimitInfo.requests > rateLimit.maxRequests) {
      logRateLimitInfo(routeKey, rateLimitInfo, false);

      const retryAfter = Math.ceil(
        (rateLimitInfo.resetTime - Date.now()) / 1000,
      );
      responseData.status = 429;
      responseData.payload = {
        status: "error",
        code: "rate_limited",
        message: "Too many requests, please try again later.",
        reason: "rate_limit_exceeded",
        retryAfter,
        details: {
          kind: "rate_limited",
          retryAfterMs: Math.max(0, retryAfter) * 1000,
        },
      };
      responseData.setHeader("Retry-After", retryAfter.toString());

      return false;
    }

    logRateLimitInfo(routeKey, rateLimitInfo, true);

    return true;
  } catch (err) {
    logger.error({ err }, "Rate limit check failed");
    responseData.status = 503;
    responseData.payload = {
      status: "error",
      code: "rate_limit_unavailable",
      message: "Request throttling is temporarily unavailable.",
      reason: "rate_limit_check_failed",
      details: {
        kind: "rate_limit_unavailable",
      },
    };
    return false;
  }
}
