import type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from "shared/schemas";
import { Result } from "better-result";
import { pushSubscriptionRepository } from "#app/repositories/index.js";
import { pushSubscriptionTransformer } from "#app/transformers/index.js";
import {
  internalMessage,
  notFound,
  type AppResult,
} from "#app/services/shared/errors.js";
import { tryInternal } from "#app/services/shared/result-helpers.js";
import { getPushSubscriptionStatistics } from "#app/services/statistics/push-subscription-statistics-service.js";

export const pushSubscriptionService = {
  async getSubscriptions(userId: bigint): Promise<
    AppResult<{
      subscriptions: ReturnType<
        typeof pushSubscriptionTransformer.serializeArrayWithLogs
      >;
    }>
  > {
    const subscriptionsResult = await tryInternal(
      () => pushSubscriptionRepository.findByUserIdWithLogs(userId),
      "Failed to load subscriptions",
    );
    if (Result.isError(subscriptionsResult)) {
      return Result.err(subscriptionsResult.error);
    }

    return Result.ok({
      subscriptions: pushSubscriptionTransformer.serializeArrayWithLogs(
        subscriptionsResult.value,
      ),
    });
  },

  async createSubscription(
    userId: bigint,
    payload: CreateSubscriptionInput,
  ): Promise<
    AppResult<{
      subscription: ReturnType<typeof pushSubscriptionTransformer.serialize>;
    }>
  > {
    const existingSubscriptionResult = await tryInternal(
      () => pushSubscriptionRepository.findByEndpoint(payload.endpoint),
      "Failed to load subscription",
    );
    if (Result.isError(existingSubscriptionResult)) {
      return Result.err(existingSubscriptionResult.error);
    }

    const existingSubscription = existingSubscriptionResult.value;

    if (existingSubscription !== undefined) {
      const updatedResult = await tryInternal(
        () =>
          pushSubscriptionRepository.updateByEndpoint(
            payload.endpoint,
            userId,
            {
              p256dhKey: payload.p256dhKey,
              authKey: payload.authKey,
              userAgent: payload.userAgent,
              ipAddress: payload.ipAddress,
              deviceType: payload.deviceType,
              browserName: payload.browserName,
              browserVersion: payload.browserVersion,
              osName: payload.osName,
              osVersion: payload.osVersion,
              notificationTypes: payload.notificationTypes,
              timezone: payload.timezone,
              isActive: true,
            },
          ),
        "Failed to update subscription",
      );
      if (Result.isError(updatedResult)) {
        return Result.err(updatedResult.error);
      }
      const updated = updatedResult.value;
      if (updated === undefined) {
        return Result.err(internalMessage("Failed to update subscription"));
      }

      return Result.ok({
        subscription: pushSubscriptionTransformer.serialize(updated),
      });
    }

    const createdResult = await tryInternal(
      () =>
        pushSubscriptionRepository.create({
          endpoint: payload.endpoint,
          p256dhKey: payload.p256dhKey,
          authKey: payload.authKey,
          userAgent: payload.userAgent ?? null,
          ipAddress: payload.ipAddress ?? null,
          deviceType: payload.deviceType ?? null,
          browserName: payload.browserName ?? null,
          browserVersion: payload.browserVersion ?? null,
          osName: payload.osName ?? null,
          osVersion: payload.osVersion ?? null,
          notificationTypes: payload.notificationTypes,
          timezone: payload.timezone ?? null,
          userId,
        }),
      "Failed to create subscription",
    );
    if (Result.isError(createdResult)) {
      return Result.err(createdResult.error);
    }

    return Result.ok({
      subscription: pushSubscriptionTransformer.serialize(createdResult.value),
    });
  },

  async getSubscription(
    userId: bigint,
    subscriptionId: bigint,
  ): Promise<AppResult<{ data: Record<string, unknown> }>> {
    const result = await tryInternal(
      () =>
        Promise.all([
          pushSubscriptionRepository.findByIdAndUserId(subscriptionId, userId),
          pushSubscriptionRepository.getLogsBySubscriptionId(
            subscriptionId,
            userId,
            10,
          ),
        ]),
      "Failed to load subscription",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }

    const [subscription, logs] = result.value;

    if (subscription === undefined) {
      return Result.err(notFound("Subscription", "Subscription not found"));
    }

    return Result.ok({
      data: {
        ...pushSubscriptionTransformer.serialize(subscription),
        notificationLogs: logs,
      },
    });
  },

  async updateSubscription(
    userId: bigint,
    subscriptionId: bigint,
    payload: UpdateSubscriptionInput,
  ): Promise<
    AppResult<{
      subscription: ReturnType<typeof pushSubscriptionTransformer.serialize>;
    }>
  > {
    const updateData = {
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      ...(payload.notificationTypes !== undefined
        ? { notificationTypes: payload.notificationTypes }
        : {}),
      ...(payload.timezone !== undefined ? { timezone: payload.timezone } : {}),
      ...(payload.deviceType !== undefined
        ? { deviceType: payload.deviceType }
        : {}),
      ...(payload.browserName !== undefined
        ? { browserName: payload.browserName }
        : {}),
      ...(payload.browserVersion !== undefined
        ? { browserVersion: payload.browserVersion }
        : {}),
      ...(payload.osName !== undefined ? { osName: payload.osName } : {}),
      ...(payload.osVersion !== undefined
        ? { osVersion: payload.osVersion }
        : {}),
    };

    const updatedResult = await tryInternal(
      () =>
        pushSubscriptionRepository.update(subscriptionId, userId, updateData),
      "Failed to update subscription",
    );
    if (Result.isError(updatedResult)) {
      return Result.err(updatedResult.error);
    }

    const updated = updatedResult.value;
    if (updated === undefined) {
      return Result.err(notFound("Subscription", "Subscription not found"));
    }

    return Result.ok({
      subscription: pushSubscriptionTransformer.serialize(updated),
    });
  },

  async deleteSubscription(
    userId: bigint,
    subscriptionId: bigint,
  ): Promise<AppResult<{ message: string }>> {
    const deletedResult = await tryInternal(
      () => pushSubscriptionRepository.delete(subscriptionId, userId),
      "Failed to delete subscription",
    );
    if (Result.isError(deletedResult)) {
      return Result.err(deletedResult.error);
    }

    const deleted = deletedResult.value;
    if (!deleted) {
      return Result.err(notFound("Subscription", "Subscription not found"));
    }

    return Result.ok({ message: "Subscription deleted successfully" });
  },

  async getSubscriptionLogs(
    userId: bigint,
    subscriptionId: bigint,
  ): Promise<
    AppResult<{
      data: Awaited<
        ReturnType<typeof pushSubscriptionRepository.getLogsBySubscriptionId>
      >;
    }>
  > {
    const logsResult = await tryInternal(
      () =>
        pushSubscriptionRepository.getLogsBySubscriptionId(
          subscriptionId,
          userId,
          50,
        ),
      "Failed to load subscription logs",
    );
    if (Result.isError(logsResult)) {
      return Result.err(logsResult.error);
    }

    return Result.ok({ data: logsResult.value });
  },

  async getSubscriptionStatistics(
    userId: bigint,
    subscriptionId: bigint,
  ): Promise<
    AppResult<{
      data: NonNullable<
        Awaited<ReturnType<typeof getPushSubscriptionStatistics>>
      >;
    }>
  > {
    const dataResult = await tryInternal(
      () => getPushSubscriptionStatistics(subscriptionId, userId),
      "Failed to load subscription statistics",
    );
    if (Result.isError(dataResult)) {
      return Result.err(dataResult.error);
    }

    const data = dataResult.value;
    if (data === undefined) {
      return Result.err(notFound("Subscription", "Subscription not found"));
    }

    return Result.ok({ data });
  },

  async deactivateSubscription(
    userId: bigint,
    subscriptionId: bigint,
  ): Promise<
    AppResult<{
      data: ReturnType<typeof pushSubscriptionTransformer.serialize>;
    }>
  > {
    const deactivatedResult = await tryInternal(
      () => pushSubscriptionRepository.deactivate(subscriptionId, userId),
      "Failed to deactivate subscription",
    );
    if (Result.isError(deactivatedResult)) {
      return Result.err(deactivatedResult.error);
    }

    const deactivated = deactivatedResult.value;
    if (deactivated === undefined) {
      return Result.err(notFound("Subscription", "Subscription not found"));
    }

    return Result.ok({
      data: pushSubscriptionTransformer.serialize(deactivated),
    });
  },
};
