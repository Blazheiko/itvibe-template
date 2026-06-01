import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResponseData, RouteItem } from "#vendor/types/types.js";

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
    url: "/login",
    method: "post",
    rateLimit,
    handler: vi.fn(),
  }) as unknown as RouteItem;

const createResponseData = (): ResponseData => ({
  aborted: false,
  payload: null,
  middlewareData: {},
  headers: [],
  cookies: new Map(),
  status: 200,
  deleteCookie: vi.fn(),
  setCookie: vi.fn(),
  setHeader: vi.fn(),
});

describe("checkRateLimit", () => {
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
    const checkRateLimit = (await import("./http-rate-limit.js")).default;
    const responseData = createResponseData();

    const allowed = checkRateLimit("127.0.0.1", responseData, createRoute());

    expect(allowed).toBe(true);
    expect(updateRateLimitCounterMock).not.toHaveBeenCalled();
    expect(responseData.status).toBe(200);
    expect(responseData.payload).toBeNull();
  });

  it("fails closed when the configured limit cannot be checked", async () => {
    updateRateLimitCounterMock.mockImplementationOnce(() => {
      throw new Error("counter unavailable");
    });

    const checkRateLimit = (await import("./http-rate-limit.js")).default;
    const responseData = createResponseData();

    const allowed = checkRateLimit(
      "127.0.0.1",
      responseData,
      createRoute({ windowMs: 60_000, maxRequests: 10 }),
    );

    expect(allowed).toBe(false);
    expect(responseData.status).toBe(503);
    expect(responseData.payload).toMatchObject({
      status: "error",
      code: "rate_limit_unavailable",
      reason: "rate_limit_check_failed",
    });
  });
});
