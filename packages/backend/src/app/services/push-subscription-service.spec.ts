import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const pushSubscriptionRepositoryMock = {
  findByUserIdWithLogs: vi.fn(),
  findByEndpoint: vi.fn(),
  updateByEndpoint: vi.fn(),
  create: vi.fn(),
  findByIdAndUserId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getLogsBySubscriptionId: vi.fn(),
  deactivate: vi.fn(),
};

const pushSubscriptionTransformerMock = {
  serialize: vi.fn((value: unknown) => ({ serialized: value })),
  serializeArrayWithLogs: vi.fn((value: unknown) => ({
    serializedArray: value,
  })),
};

const getPushSubscriptionStatisticsMock = vi.fn();

vi.mock("#app/repositories/index.js", () => ({
  pushSubscriptionRepository: pushSubscriptionRepositoryMock,
}));

vi.mock("#app/transformers/index.js", () => ({
  pushSubscriptionTransformer: pushSubscriptionTransformerMock,
}));

vi.mock(
  "#app/services/statistics/push-subscription-statistics-service.js",
  () => ({
    getPushSubscriptionStatistics: getPushSubscriptionStatisticsMock,
  }),
);

async function loadPushSubscriptionService() {
  return import("./push-subscription-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("pushSubscriptionService", () => {
  it("returns serialized subscriptions", async () => {
    pushSubscriptionRepositoryMock.findByUserIdWithLogs.mockResolvedValue([
      { id: 1n },
    ]);

    const { pushSubscriptionService } = await loadPushSubscriptionService();
    const result = await pushSubscriptionService.getSubscriptions(7n);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        subscriptions: { serializedArray: [{ id: 1n }] },
      });
    }
  });

  it("updates an existing subscription", async () => {
    pushSubscriptionRepositoryMock.findByEndpoint.mockResolvedValue({
      id: 1n,
      endpoint: "https://push.example.com/ep",
    });
    pushSubscriptionRepositoryMock.updateByEndpoint.mockResolvedValue({
      id: 1n,
      endpoint: "https://push.example.com/ep",
    });

    const { pushSubscriptionService } = await loadPushSubscriptionService();
    const result = await pushSubscriptionService.createSubscription(7n, {
      endpoint: "https://push.example.com/ep",
      p256dhKey: "key",
      authKey: "auth",
      notificationTypes: ["system"],
    } as any);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        subscription: {
          serialized: { id: 1n, endpoint: "https://push.example.com/ep" },
        },
      });
    }
  });

  it("returns not found for missing subscription statistics", async () => {
    getPushSubscriptionStatisticsMock.mockResolvedValue(undefined);

    const { pushSubscriptionService } = await loadPushSubscriptionService();
    const result = await pushSubscriptionService.getSubscriptionStatistics(
      7n,
      1n,
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "NotFound",
        resource: "Subscription",
        message: "Subscription not found",
      });
    }
  });
});
