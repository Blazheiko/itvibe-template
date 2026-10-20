import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MyWebSocket, RouteItem } from "#vendor/types/types.js";

vi.mock("#vendor/utils/logger.js", () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const createRoute = (rateLimit?: RouteItem["rateLimit"]): RouteItem =>
  ({
    url: "message_send",
    method: "ws",
    rateLimit,
    handler: vi.fn(),
  }) as unknown as RouteItem;

const createWs = (ip = "127.0.0.1"): MyWebSocket =>
  ({
    getUserData: () => ({ ip }),
  }) as unknown as MyWebSocket;

describe("checkRateLimitWs", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("leaves routes without configured limits unrestricted", async () => {
    const checkRateLimitWs = (await import("./ws-rate-limit.js")).default;

    const result = checkRateLimitWs(createWs(), createRoute());

    expect(result).toEqual({ allowed: true });
  });

  it("rejects over the limit with retryAfter in seconds", async () => {
    const checkRateLimitWs = (await import("./ws-rate-limit.js")).default;
    const route = createRoute({ windowMs: 60_000, maxRequests: 1 });

    expect(checkRateLimitWs(createWs("10.0.0.9"), route)).toEqual({
      allowed: true,
    });
    expect(checkRateLimitWs(createWs("10.0.0.9"), route)).toEqual({
      allowed: false,
      retryAfter: 60,
      errorMessage: "Rate limit exceeded for message_send",
    });
  });

  it("fails closed when the configured limit cannot be checked", async () => {
    const { rateLimitStore } = await import("./rate-limit-store.js");
    vi.spyOn(rateLimitStore, "consume").mockImplementationOnce(() => {
      throw new Error("counter unavailable");
    });

    const checkRateLimitWs = (await import("./ws-rate-limit.js")).default;

    const result = checkRateLimitWs(
      createWs(),
      createRoute({ windowMs: 60_000, maxRequests: 10 }),
    );

    expect(result).toMatchObject({
      allowed: false,
      errorMessage: "Rate limit check failed",
      retryAfter: 1,
    });
  });
});
