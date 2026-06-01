import type { HttpContext } from "#vendor/types/types.js";
import { applyAppErrorStatus } from "#app/services/shared/apply-service-status.js";
import { mapControllerError } from "#app/controllers/shared/controller-error.js";
import { knowledgeBaseService } from "#app/services/support/knowledge-base-service.js";
import { supportService } from "#app/services/support/support-service.js";
import { badRequest, notFound, unauthorized } from "#app/services/shared/errors.js";
import type {
  SupportGetChatHistoryResponse,
  SupportDeleteChatHistoryResponse,
} from "shared/responses";
import { Result } from "better-result";

function getUserId(context: HttpContext): bigint | null {
  if (!context.auth.check()) {
    applyAppErrorStatus(context.responseData, unauthorized());
    return null;
  }
  const id = context.auth.getUserId();
  if (id === null) {
    applyAppErrorStatus(context.responseData, unauthorized());
    return null;
  }
  return BigInt(id);
}

export default {
  async getChatHistory(
    context: HttpContext,
  ): Promise<SupportGetChatHistoryResponse> {
    const userId = getUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const result = await supportService.getChatHistory(userId);
    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return { status: "ok", data: result.value.data };
  },

  async deleteChatHistory(
    context: HttpContext,
  ): Promise<SupportDeleteChatHistoryResponse> {
    const userId = getUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const result = await supportService.deleteChatHistory(userId);
    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }
    return { status: "ok" };
  },

  async getScreenshot(
    context: HttpContext,
  ): Promise<{ status: string; message?: string }> {
    const userId = getUserId(context);
    if (userId === null) return mapControllerError(context, unauthorized());

    const articleIdStr = context.httpData.params["articleId"];
    if (articleIdStr === undefined) {
      return mapControllerError(context, badRequest("Missing articleId"));
    }

    let articleId: bigint;
    try {
      articleId = BigInt(articleIdStr);
    } catch {
      return mapControllerError(context, badRequest("Invalid articleId"));
    }

    const screenshotKeyResult =
      await knowledgeBaseService.getScreenshotUrl(articleId);
    if (Result.isError(screenshotKeyResult)) {
      return mapControllerError(context, screenshotKeyResult.error);
    }

    const signedUrl = screenshotKeyResult.value.signedUrl;
    if (signedUrl === null) {
      return mapControllerError(
        context,
        notFound("Screenshot", "Screenshot not found"),
      );
    }

    context.responseData.status = 302;
    context.responseData.setHeader("Location", signedUrl);
    return { status: "redirect" };
  },
};
