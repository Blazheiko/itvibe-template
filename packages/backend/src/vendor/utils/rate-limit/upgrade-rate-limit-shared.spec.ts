import { beforeEach, describe, expect, it, vi } from "vitest";

const evalMock = vi.fn();
vi.mock("#database/redis-rate-limit.js", () => ({
  default: { eval: evalMock },
}));

const warn = vi.fn();
vi.mock("#vendor/utils/logger.js", () => ({
  default: { debug: vi.fn(), error: vi.fn(), warn },
}));

const policy = { limit: 60, windowMs: 60_000, scope: "upgrade" };
vi.mock("#config/throttle-policies.js", () => ({
  throttlePolicies: { wsUpgradeShared: policy },
}));

vi.mock("#config/rate-limit.js", () => ({
  default: {
    httpGlobal: { windowMs: 60_000, max: 100 },
    wsUpgrade: { windowMs: 60_000, max: 5 },
    configError: null,
  },
}));

beforeEach(() => {
  vi.resetModules();
  evalMock.mockReset();
  warn.mockClear();
  policy.limit = 60;
});

describe("checkUpgradeRateLimitShared", () => {
  it("does not call Redis when the policy is disabled (limit 0)", async () => {
    policy.limit = 0;
    const { checkUpgradeRateLimitShared } =
      await import("./upgrade-rate-limit.js");
    await expect(checkUpgradeRateLimitShared("10.2.0.1")).resolves.toEqual({
      kind: "allowed",
    });
    expect(evalMock).not.toHaveBeenCalled();
  });

  it("checks rl:upgrade:<ip> and allows within the budget", async () => {
    evalMock.mockResolvedValue([1, 59, 0]);
    const { checkUpgradeRateLimitShared } =
      await import("./upgrade-rate-limit.js");
    await expect(checkUpgradeRateLimitShared("10.2.0.2")).resolves.toEqual({
      kind: "allowed",
    });
    expect(evalMock.mock.calls[0]?.[2]).toBe("rl:upgrade:10.2.0.2");
  });

  it("reports limited with Retry-After in seconds", async () => {
    evalMock.mockResolvedValue([0, 1500, 0]);
    const { checkUpgradeRateLimitShared } =
      await import("./upgrade-rate-limit.js");
    await expect(checkUpgradeRateLimitShared("10.2.0.3")).resolves.toEqual({
      kind: "limited",
      retryAfter: 2,
    });
  });

  it("skips on a Redis error and consumes exactly one local attempt per upgrade", async () => {
    evalMock.mockRejectedValue(new Error("Command timed out"));
    const mod = await import("./upgrade-rate-limit.js");
    const check = mod.default;
    // Level 1 budget is 5: five upgrades pass levels 1 and 2 (skipped), the sixth hits level 1.
    for (let i = 0; i < 5; i++) {
      expect(check("10.2.0.4")).toEqual({ kind: "allowed" });
      await expect(
        mod.checkUpgradeRateLimitShared("10.2.0.4"),
      ).resolves.toEqual({
        kind: "allowed",
      });
    }
    expect(check("10.2.0.4").kind).toBe("limited");
    const unavailable = warn.mock.calls.filter((call) =>
      String(call[1]).includes("relying on the local limit"),
    );
    expect(unavailable).toHaveLength(1);
  });
});
