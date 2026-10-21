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
  get: vi.fn(),
  getex: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
  multi: vi.fn(),
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

/**
 * A tiny keyspace for SCAN: `size` foreign keys interleaved with the user's
 * sessions, 10 keys per SCAN call, cursor = index of the next key.
 */
const createKeyspace = (sessionIds: string[], foreign = 0) => {
  const store = new Map<string, string>();
  const keys: string[] = [];
  for (let i = 0; i < foreign; i++) keys.push(`other:${String(i)}`);
  sessionIds.forEach((id, n) => {
    keys.splice(Math.floor(((n + 1) * keys.length) / (sessionIds.length + 1)), 0, `session:${USER_TOKEN}:${id}`);
  });
  const live = new Set(keys);
  const scanCursors: string[] = [];
  redis.scan.mockImplementation(async (cursor: string, _m: string, pattern: string) => {
    scanCursors.push(cursor);
    const start = Number(cursor);
    const batch = keys.slice(start, start + 10);
    const next = start + 10 >= keys.length ? "0" : String(start + 10);
    const match = pattern.slice(0, -1); // "test:session:<token>:*"
    return [next, batch.filter((k) => live.has(k)).map((k) => `test:${k}`).filter((k) => k.startsWith(match))];
  });
  redis.del.mockImplementation(async (...del: string[]) => {
    let n = 0;
    for (const k of del) {
      if (live.delete(k) || store.delete(k)) n++;
    }
    return n;
  });
  redis.multi.mockImplementation(() => {
    const queued: string[][] = [];
    const tx = {
      del: (...del: string[]) => {
        queued.push(del);
        return tx;
      },
      exec: async () => {
        const results: [null, number][] = [];
        for (const del of queued) {
          let n = 0;
          for (const k of del) if (live.delete(k) || store.delete(k)) n++;
          results.push([null, n]);
        }
        return results;
      },
    };
    return tx;
  });
  redis.get.mockImplementation(async (k: string) => store.get(k) ?? null);
  redis.setex.mockImplementation(async (k: string, _ttl: number, v: string) => {
    store.set(k, v);
    return "OK";
  });
  return {
    live,
    store,
    scanCursors,
    has: (id: string) => live.has(`session:${USER_TOKEN}:${id}`),
    sessions: () => [...live].filter((k) => k.startsWith("session:")),
  };
};

/** Lets `ok` withRedis calls through, then fails every later one. */
const failAfter = (ok: number): void => {
  let calls = 0;
  withRedis.mockImplementation(async (op) => {
    calls += 1;
    if (calls > ok) throw new RedisUnavailableError();
    return op();
  });
};

describe("destroyAllSessions", () => {
  it("deletes every session after a full SCAN, the kept one last", async () => {
    const ks = createKeyspace(["a", "b", "current", "c"], 25);

    await expect(storage.destroyAllSessions(USER_TOKEN, "current")).resolves.toBe(4);

    expect(ks.sessions()).toEqual([]);
    expect(redis.multi).toHaveBeenCalledTimes(1); // cursor + kept session together
    expect(ks.store.size).toBe(0); // cursor key removed
  });

  it("a stopped run keeps the caller's session and the repeat resumes from the saved cursor", async () => {
    const ks = createKeyspace(["a", "current", "b", "c"], 25);
    // get, scan, del?, setex ... fail somewhere in the middle of the keyspace
    failAfter(5);

    await expect(
      storage.destroyAllSessions(USER_TOKEN, "current"),
    ).rejects.toBeInstanceOf(RedisUnavailableError);
    expect(ks.has("current")).toBe(true); // repeat stays authenticated
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ deletedCount: expect.any(Number) }),
      expect.stringContaining("Stopped deleting all sessions"),
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(USER_TOKEN);
    const saved = ks.store.get(`logout_all:cursor:${USER_TOKEN}`);
    expect(saved).toBeDefined();
    expect(saved).not.toBe("0");

    withRedis.mockImplementation(async (op) => op());
    ks.scanCursors.length = 0;
    await expect(storage.destroyAllSessions(USER_TOKEN, "current")).resolves.toBeGreaterThan(0);

    expect(ks.scanCursors[0]).toBe(saved); // resumed, not restarted at 0
    expect(ks.sessions()).toEqual([]);
  });

  it("repeats make progress on a keyspace larger than one attempt can scan", async () => {
    const ks = createKeyspace(["a", "b", "c", "current"], 400); // 41 SCAN pages
    let attempts = 0;
    let finished = false;
    while (!finished && attempts < 50) {
      attempts += 1;
      failAfter(9); // each attempt gets through only a few pages
      finished = await storage
        .destroyAllSessions(USER_TOKEN, "current")
        .then(() => true, () => false);
    }

    expect(finished).toBe(true);
    expect(attempts).toBeLessThan(50);
    expect(ks.sessions()).toEqual([]);
    // No restart from 0 after the first attempt; at most the interrupted page
    // is scanned again per attempt (the cursor is saved after its DEL).
    expect(ks.scanCursors.filter((c) => c === "0")).toHaveLength(1);
    const nonZero = ks.scanCursors.filter((c) => c !== "0");
    expect(nonZero.length - new Set(nonZero).size).toBeLessThanOrEqual(attempts);
  });

  it("gives up at the deadline, not deadline + command timeout", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    redis.get.mockResolvedValue(null);
    redis.setex.mockResolvedValue("OK");
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
