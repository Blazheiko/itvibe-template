import type { HttpContext } from "#vendor/types/types.js";
import { Result } from "better-result";
import { avatarService } from "#app/services/user/avatar-service.js";
import { mapControllerError } from "#app/controllers/shared/controller-error.js";
import { unauthorized } from "#app/services/shared/errors.js";
import type { EmptyFormInput } from "shared/schemas";
import type {
  UploadAvatarResponse,
  DeleteAvatarResponse,
} from "shared/responses";

function resolveUserId(context: HttpContext): bigint | null {
  if (!context.auth.check()) {
    mapControllerError(context, unauthorized());
    return null;
  }

  const userId = context.auth.getUserId();
  if (userId === null) {
    mapControllerError(context, unauthorized());
    return null;
  }

  return BigInt(userId);
}

export default {
  async uploadAvatar(
    context: HttpContext<EmptyFormInput>,
  ): Promise<UploadAvatarResponse> {
    context.logger.info("uploadAvatar handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const file = context.httpData.files?.get("avatar");
    const result = await avatarService.uploadAvatar(userId, file);

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return { status: "ok", user: result.value.user };
  },

  async deleteAvatar(context: HttpContext): Promise<DeleteAvatarResponse> {
    context.logger.info("deleteAvatar handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const result = await avatarService.deleteAvatar(userId);

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return { status: "ok", user: result.value.user };
  },

};
