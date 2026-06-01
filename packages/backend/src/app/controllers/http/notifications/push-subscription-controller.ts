import type { HttpContext } from "#vendor/types/types.js";
import { Result } from "better-result";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { mapControllerError } from "#app/controllers/shared/controller-error.js";
import { applyAppErrorStatus } from "#app/services/shared/apply-service-status.js";
import { pushSubscriptionService } from "#app/services/notifications/push-subscription-service.js";
import { pushNotificationSenderService } from "#app/services/notifications/push-notification-sender-service.js";
import { internalMessage, unauthorized } from "#app/services/shared/errors.js";
import type {
  GetSubscriptionsResponse,
  CreateSubscriptionResponse,
  GetSubscriptionResponse,
  UpdateSubscriptionResponse,
  DeleteSubscriptionResponse,
  GetSubscriptionLogsResponse,
  GetSubscriptionStatisticsResponse,
  DeactivateSubscriptionResponse,
  GetVapidPublicKeyResponse,
} from "shared";
import type {
  CreateSubscriptionInput,
  EmptyFormInput,
  PushSubscriptionTestQuery,
  UpdateSubscriptionInput,
} from "shared/schemas";

function resolveUserId(context: HttpContext<unknown, unknown>): bigint | null {
  if (!context.auth.check()) {
    applyAppErrorStatus(context.responseData, unauthorized());
    return null;
  }

  const userId = context.auth.getUserId();
  if (userId === null) {
    applyAppErrorStatus(context.responseData, unauthorized());
    return null;
  }

  return BigInt(userId);
}

export default {
  async getVapidPublicKey(
    context: HttpContext,
  ): Promise<GetVapidPublicKeyResponse> {
    context.logger.info("getVapidPublicKey handler");

    const vapidPublicKey = pushNotificationSenderService.getVapidPublicKey();
    if (vapidPublicKey === "") {
      return mapControllerError(
        context,
        internalMessage("VAPID keys not configured"),
      );
    }

    return Promise.resolve({ status: "success", vapidPublicKey });
  },

  async getSubscriptions(
    context: HttpContext,
  ): Promise<GetSubscriptionsResponse> {
    context.logger.info("getSubscriptions handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const result = await pushSubscriptionService.getSubscriptions(userId);
    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return {
      status: "success",
      subscriptions: result.value.subscriptions,
    };
  },

  async createSubscription(
    context: HttpContext<CreateSubscriptionInput>,
  ): Promise<CreateSubscriptionResponse> {
    context.logger.info("createSubscription handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const payload = getTypedPayload(context);
    const result = await pushSubscriptionService.createSubscription(
      userId,
      payload,
    );

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return {
      status: "success",
      subscription: result.value.subscription,
    };
  },

  async getSubscription(
    context: HttpContext,
  ): Promise<GetSubscriptionResponse> {
    context.logger.info("getSubscription handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const { subscriptionId } = context.httpData.params as {
      subscriptionId: string;
    };
    const result = await pushSubscriptionService.getSubscription(
      userId,
      BigInt(subscriptionId),
    );

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return {
      status: "success",
      data: result.value.data,
    };
  },

  async updateSubscription(
    context: HttpContext<UpdateSubscriptionInput>,
  ): Promise<UpdateSubscriptionResponse> {
    context.logger.info("updateSubscription handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const { subscriptionId } = context.httpData.params as {
      subscriptionId: string;
    };
    const payload = getTypedPayload(context);

    const result = await pushSubscriptionService.updateSubscription(
      userId,
      BigInt(subscriptionId),
      payload,
    );

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return {
      status: "success",
      subscription: result.value.subscription,
    };
  },

  async deleteSubscription(
    context: HttpContext,
  ): Promise<DeleteSubscriptionResponse> {
    context.logger.info("deleteSubscription handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const { subscriptionId } = context.httpData.params as {
      subscriptionId: string;
    };
    const result = await pushSubscriptionService.deleteSubscription(
      userId,
      BigInt(subscriptionId),
    );

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return { status: "success", message: result.value.message };
  },

  async getSubscriptionLogs(
    context: HttpContext,
  ): Promise<GetSubscriptionLogsResponse> {
    context.logger.info("getSubscriptionLogs handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const { subscriptionId } = context.httpData.params as {
      subscriptionId: string;
    };
    const result = await pushSubscriptionService.getSubscriptionLogs(
      userId,
      BigInt(subscriptionId),
    );

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return { status: "success", data: result.value.data };
  },

  async getSubscriptionStatistics(
    context: HttpContext,
  ): Promise<GetSubscriptionStatisticsResponse> {
    context.logger.info("getSubscriptionStatistics handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const { subscriptionId } = context.httpData.params as {
      subscriptionId: string;
    };
    const result = await pushSubscriptionService.getSubscriptionStatistics(
      userId,
      BigInt(subscriptionId),
    );

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return {
      status: "success",
      data: result.value.data,
    };
  },

  async deactivateSubscription(
    context: HttpContext<EmptyFormInput>,
  ): Promise<DeactivateSubscriptionResponse> {
    context.logger.info("deactivateSubscription handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const { subscriptionId } = context.httpData.params as {
      subscriptionId: string;
    };
    const result = await pushSubscriptionService.deactivateSubscription(
      userId,
      BigInt(subscriptionId),
    );

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return {
      status: "success",
      data: result.value.data,
    };
  },

  async testPush(
    context: HttpContext<unknown, PushSubscriptionTestQuery>,
  ): Promise<{
    status: string;
    message: string;
    sent?: number;
    failed?: number;
  }> {
    context.logger.info("testPush handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    if (!pushNotificationSenderService.isConfigured()) {
      return mapControllerError(
        context,
        internalMessage("VAPID keys not configured"),
      );
    }

    const title = context.httpData.query.title ?? "Test Push";
    const body =
      context.httpData.query.body ?? "This is a test push notification";

    const result = await pushNotificationSenderService.sendToUser(userId, {
      title,
      body,
      url: "/",
      tag: "test-push",
      data: { type: "test" },
    });

    return {
      status: "success",
      message: `Sent: ${String(result.sent)}, Failed: ${String(result.failed)}`,
      sent: result.sent,
      failed: result.failed,
    };
  },
};
