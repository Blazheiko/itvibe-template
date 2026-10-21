import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RedisUnavailableError } from "#vendor/utils/network/errors/redis-unavailable-error.js";

const logger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));
vi.mock("#vendor/utils/logger.js", () => ({ default: logger }));
vi.mock("#config/redis.js", () => ({
  default: {
    keyPrefix: "test:",
    commandTimeoutMs: 500,
    logoutAllDeadlineMs: 2000,
  },
}));

const redis = vi.hoisted(() => ({
  getex: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
}));
// The real classification is covered in redis-health.spec.ts; here withRedis
// only has to turn a failure into RedisUnavailableError like the real one.
const withRedis = vi.hoisted(() =>
  vi.fn(async <T>(op: () => Promise<T>): Promise<T> => op()),
);
vi.mock("#database/redis.js", () => ({ default: redis, withRedis }));

const storage = await import("./redis-session-storage.js");

const USER_TOKEN = "abcdef0123456789abcdef0123456789";
const SESSION = {
  id: "s1",
  data: { userToken: USER_TOKEN, csrfToken: "c" },
  createdAt: "2026-10-21T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  withRedis.mockImplementation(async (op) => op());
});
afterEach(() => {
  vi.useRealTimers();
});

describe("session operations go through withRedis", () => {
  it.each([
    ["getSession", () => storage.getSession("s1", USER_TOKEN)],
    ["saveSession", () => storage.saveSession(SESSION)],
    ["destroySession", () => storage.destroySession("s1", USER_TOKEN)],
    [
      "changeSessionData",
      () => storage.changeSessionData("s1", { a: 1 }, USER_TOKEN),
    ],
  ])("%s rejects with RedisUnavailableError when Redis is down", async (_, call) => {
    withRedis.mockRejectedValue(new RedisUnavailableError());
    await expect(call()).rejects.toBeInstanceOf(RedisUnavailableError);
  });
});

describe("updateSessionData", () => {
  it("reads, then saves the merged session", async () => {
    redis.getex.mockResolvedValue(JSON.stringify(SESSION));
    redis.setex.mockResolvedValue("OK");

    const updated = await storage.updateSessionData(
      "s1",
      { csrfToken: "next" },
      USER_TOKEN,
    );

    expect(redis.getex.mock.invocationCallOrder[0]).toBeLessThan(
      redis.setex.mock.invocationCallOrder[0] ?? 0,
    );
    expect(updated?.data).toMatchObject({ userToken: USER_TOKEN, csrfToken: "next" });
    const saved = JSON.parse(String(redis.setex.mock.calls[0]?.[2])) as {
      data: Record<string, unknown>;
    };
    expect(saved.data["csrfToken"]).toBe("next");
  });

  it("does not write when the read fails with RedisUnavailableError", async () => {
    withRedis.mockRejectedValueOnce(new RedisUnavailableError());

    await expect(
      storage.updateSessionData("s1", { csrfToken: "next" }, USER_TOKEN),
    ).rejects.toBeInstanceOf(RedisUnavailableError);
    expect(withRedis).toHaveBeenCalledTimes(1);
    expect(redis.setex).not.toHaveBeenCalled();
  });
});

describe("destroyAllSessions", () => {
  it("returns the count after a full SCAN to cursor 0", async () => {
    redis.scan
      .mockResolvedValueOnce(["7", ["test:session:t:1", "test:session:t:2"]])
      .mockResolvedValueOnce(["0", ["test:session:t:3"]]);
    redis.del.mockResolvedValue(1);

    await expect(storage.destroyAllSessions(USER_TOKEN)).resolves.toBe(3);
    expect(redis.del).toHaveBeenNthCalledWith(1, "session:t:1", "session:t:2");
  });

  it("rejects without a count when Redis fails mid-loop; a repeat cleans up", async () => {
    redis.scan
      .mockResolvedValueOnce(["7", ["test:session:t:1"]])
      .mockResolvedValueOnce(["9", ["test:session:t:2"]]);
    redis.del.mockResolvedValue(1);
    withRedis
      .mockImplementationOnce(async (op) => op()) // scan
      .mockImplementationOnce(async (op) => op()) // del
      .mockImplementationOnce(async (op) => op()) // scan
      .mockRejectedValueOnce(new RedisUnavailableError()); // del

    await expect(storage.destroyAllSessions(USER_TOKEN)).rejects.toBeInstanceOf(
      RedisUnavailableError,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ deletedCount: 1 }),
      expect.stringContaining("Stopped deleting all sessions"),
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(USER_TOKEN);

    redis.scan.mockReset().mockResolvedValueOnce(["0", ["test:session:t:2"]]);
    await expect(storage.destroyAllSessions(USER_TOKEN)).resolves.toBe(1);
  });

  it("gives up at the deadline, not deadline + command timeout", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    const scanAfter = (ms: number) => () =>
      new Promise((resolve) =>
        setTimeout(() => {
          resolve(["7", []]);
        }, ms),
      );
    // Four 490 ms SCANs and one of 30 ms: the next command starts at 1990 ms,
    // 10 ms before the 2000 ms deadline, and hangs.
    for (const ms of [490, 490, 490, 490, 30]) {
      redis.scan.mockImplementationOnce(scanAfter(ms));
    }
    redis.scan.mockImplementationOnce(() => new Promise(() => {}));

    let settledAt = 0;
    const result = storage
      .destroyAllSessions(USER_TOKEN)
      .catch((err: unknown) => {
        settledAt = Date.now();
        return err;
      });
    await vi.advanceTimersByTimeAsync(3_000);

    expect(await result).toBeInstanceOf(RedisUnavailableError);
    expect(redis.scan).toHaveBeenCalledTimes(6);
    // Not 1990 + 500 (the command timeout): the remaining 10 ms only.
    expect(settledAt - start).toBe(2_000);
  });
});
