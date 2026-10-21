import { beforeEach, describe, expect, it, vi } from "vitest";

import { RedisUnavailableError } from "#vendor/utils/network/errors/redis-unavailable-error.js";

const logger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));
vi.mock("#logger", () => ({ default: logger }));

const redis = vi.hoisted(() => ({
  get: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
  setex: vi.fn(),
}));
const withRedis = vi.hoisted(() =>
  vi.fn(async <T>(op: () => Promise<T>): Promise<T> => op()),
);
vi.mock("#database/redis.js", () => ({ default: redis, withRedis }));

const { wsSessionAuth } = await import("./ws-session-auth.js");
const { generateWsToken } = await import(
  "#app/services/auth/generate-ws-token-service.js"
);

const TOKEN_DATA = JSON.stringify({ sessionId: "s1", userId: "1", userToken: "u1" });
const SESSION_DATA = JSON.stringify({ id: "s1", data: { userId: "1" } });

beforeEach(() => {
  vi.clearAllMocks();
  withRedis.mockImplementation(async (op) => op());
});

describe("verifyUpgradeToken", () => {
  it("ok when token and session match", async () => {
    redis.get.mockResolvedValueOnce(TOKEN_DATA).mockResolvedValueOnce(SESSION_DATA);
    await expect(wsSessionAuth.verifyUpgradeToken("t")).resolves.toEqual({
      kind: "ok",
      sessionId: "s1",
      userId: "1",
      userToken: "u1",
    });
  });

  it("missing when the token is unknown", async () => {
    redis.get.mockResolvedValueOnce(null);
    await expect(wsSessionAuth.verifyUpgradeToken("t")).resolves.toEqual({
      kind: "missing",
    });
  });

  it("unavailable after the first failed command, without the session lookup", async () => {
    withRedis.mockRejectedValueOnce(new RedisUnavailableError());
    await expect(wsSessionAuth.verifyUpgradeToken("t")).resolves.toEqual({
      kind: "unavailable",
    });
    expect(withRedis).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("unavailable when the session lookup fails", async () => {
    redis.get.mockResolvedValueOnce(TOKEN_DATA);
    withRedis
      .mockImplementationOnce(async (op) => op())
      .mockRejectedValueOnce(new RedisUnavailableError());
    await expect(wsSessionAuth.verifyUpgradeToken("t")).resolves.toEqual({
      kind: "unavailable",
    });
  });

  it("missing (logged) on other errors, as before", async () => {
    redis.get.mockResolvedValueOnce("{not json");
    await expect(wsSessionAuth.verifyUpgradeToken("t")).resolves.toEqual({
      kind: "missing",
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});

describe("refreshToken, revokeToken, generateWsToken", () => {
  it.each([
    ["refreshToken", () => wsSessionAuth.refreshToken("t")],
    ["revokeToken", () => wsSessionAuth.revokeToken("t")],
    [
      "generateWsToken",
      () =>
        generateWsToken(
          { id: "s1", data: { userToken: "u1" }, createdAt: "" },
          "1",
        ),
    ],
  ])("%s rejects with RedisUnavailableError when Redis is down", async (_, call) => {
    withRedis.mockRejectedValue(new RedisUnavailableError());
    await expect(call()).rejects.toBeInstanceOf(RedisUnavailableError);
    expect(withRedis).toHaveBeenCalledTimes(1);
  });
});
