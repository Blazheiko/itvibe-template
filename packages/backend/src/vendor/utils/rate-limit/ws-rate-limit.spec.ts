import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MyWebSocket, RouteItem } from "#vendor/types/types.js";

const updateRateLimitCounterMock = vi.fn();
const logRateLimitInfoMock = vi.fn();

vi.mock("#vendor/utils/logger.js", () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("./rate-limit-counter.js", () => ({
  updateRateLimitCounter: updateRateLimitCounterMock,
  getRateLimitKey: (clientId: string, route: string) => `${clientId}:${route}`,
  getClientIdentifier: (ip: string) =>
    `rate_limit:${ip === "" ? "unknown" : ip}`,
  logRateLimitInfo: logRateLimitInfoMock,
}));

const createRoute = (rateLimit?: RouteItem["rateLimit"]): RouteItem =>
  ({
    url: "message_send",
    method: "ws",
    rateLimit,
    handler: vi.fn(),
  }) as unknown as RouteItem;

const createWs = (): MyWebSocket =>
  ({
    getUserData: () => ({
      ip: "127.0.0.1",
    }),
  }) as unknown as MyWebSocket;

describe("checkRateLimitWs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateRateLimitCounterMock.mockReturnValue({
      windowMs: 60_000,
      maxRequests: 0,
      requests: 1,
      resetTime: Date.now() + 60_000,
    });
  });

  it("leaves routes without configured limits unrestricted", async () => {
    const checkRateLimitWs = (await import("./ws-rate-limit.js")).default;

    const result = checkRateLimitWs(createWs(), createRoute());

    expect(result).toEqual({ allowed: true });
    expect(updateRateLimitCounterMock).not.toHaveBeenCalled();
  });

  it("fails closed when the configured limit cannot be checked", async () => {
    updateRateLimitCounterMock.mockImplementationOnce(() => {
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
