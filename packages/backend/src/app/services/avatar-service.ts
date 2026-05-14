import { randomUUID } from "node:crypto";
import path from "node:path";
import type { UploadedFile } from "#vendor/types/types.js";
import { Result } from "better-result";
import { userRepository } from "#app/repositories/index.js";
import { uploadToS3, deleteFromS3 } from "#vendor/utils/storage/s3.js";
import diskConfig from "#config/disk.js";
import aiConfig from "#config/ai.js";
import { imageAdapter } from "#app/services/ai/ai-provider.js";
import { llmUsageService } from "#app/services/llm-usage-service.js";
import logger from "#logger";
import {
  badRequest,
  internal,
  internalMessage,
  notFound,
  type AppResult,
} from "#app/services/shared/errors.js";
import { tryInternal } from "#app/services/shared/result-helpers.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface AvatarUserPayload {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface GeneratedAvatarPayload {
  imageBase64: string;
  mimeType: string;
}

function buildFullS3Key(key: string): string {
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");
  return `${prefix}/${s3DynamicDataPrefix}/${key}`;
}

function serializeUser(user: {
  id: bigint;
  name: string;
  email: string;
  avatar: string | null | undefined;
}): AvatarUserPayload {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? null,
  };
}

export const avatarService = {
  async uploadAvatar(
    userId: bigint,
    file: UploadedFile | undefined,
  ): Promise<AppResult<{ user: AvatarUserPayload }>> {
    if (file === undefined) {
      return Result.err(badRequest("No file uploaded"));
    }

    if (file.data.byteLength > MAX_FILE_SIZE) {
      return Result.err(badRequest("File size exceeds 10 MB limit"));
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Result.err(
        badRequest("Invalid file type. Allowed: jpeg, png, webp"),
      );
    }

    const userResult = await tryInternal(
      () => userRepository.findById(userId),
      "Failed to load user",
    );
    if (Result.isError(userResult)) {
      return Result.err(userResult.error);
    }
    const user = userResult.value;
    if (user === undefined) {
      return Result.err(notFound("User", "User not found"));
    }

    const extname = path.extname(file.filename);
    const ext = extname === "" ? ".webp" : extname;
    const uniqueName = `${randomUUID()}${ext}`;
    const s3Key = `avatars/${String(userId)}/${uniqueName}`;

    const uploadResult = await tryInternal(
      () => uploadToS3(s3Key, Buffer.from(file.data), file.type),
      "Failed to upload avatar",
    );
    if (Result.isError(uploadResult)) {
      return Result.err(uploadResult.error);
    }

    const oldAvatarKey = user.avatar;
    if (oldAvatarKey !== null && oldAvatarKey !== undefined) {
      const deleteOldAvatarResult = await tryInternal(
        () => deleteFromS3(buildFullS3Key(oldAvatarKey)),
        "Failed to delete old avatar",
      );
      if (Result.isError(deleteOldAvatarResult)) {
        // Best-effort cleanup: keep the upload flow alive, but do not swallow the cause.
        logger.warn(
          { err: deleteOldAvatarResult.error, oldAvatarKey },
          "Failed to delete old avatar S3 object",
        );
      }
    }

    const updatedResult = await tryInternal(
      () => userRepository.update(userId, { avatar: s3Key }),
      "Failed to update user",
    );
    if (Result.isError(updatedResult)) {
      return Result.err(updatedResult.error);
    }

    const updated = updatedResult.value;
    if (updated === undefined) {
      return Result.err(internalMessage("Failed to update user"));
    }

    return Result.ok({ user: serializeUser(updated) });
  },

  async deleteAvatar(
    userId: bigint,
  ): Promise<AppResult<{ user: AvatarUserPayload }>> {
    const userResult = await tryInternal(
      () => userRepository.findById(userId),
      "Failed to load user",
    );
    if (Result.isError(userResult)) {
      return Result.err(userResult.error);
    }

    const user = userResult.value;
    if (user === undefined) {
      return Result.err(notFound("User", "User not found"));
    }

    const avatarKey = user.avatar;
    if (avatarKey !== null && avatarKey !== undefined) {
      const deleteAvatarResult = await tryInternal(
        () => deleteFromS3(buildFullS3Key(avatarKey)),
        "Failed to delete avatar",
      );
      if (Result.isError(deleteAvatarResult)) {
        // Best-effort cleanup: preserve the main delete flow, but log the failure.
        logger.warn(
          { err: deleteAvatarResult.error, avatarKey },
          "Failed to delete avatar S3 object",
        );
      }
    }

    const updatedResult = await tryInternal(
      () => userRepository.update(userId, { avatar: null }),
      "Failed to update user",
    );
    if (Result.isError(updatedResult)) {
      return Result.err(updatedResult.error);
    }

    const updated = updatedResult.value;
    if (updated === undefined) {
      return Result.err(internalMessage("Failed to update user"));
    }

    return Result.ok({ user: serializeUser(updated) });
  },

  async generateAvatarWithAi(
    prompt: string,
    userId?: bigint,
  ): Promise<AppResult<GeneratedAvatarPayload>> {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt === "") {
      return Result.err(badRequest("Prompt is required"));
    }
    if (trimmedPrompt.length > aiConfig.maxPromptLength) {
      return Result.err(
        badRequest(
          `Prompt is too long. Max length is ${String(aiConfig.maxPromptLength)} symbols`,
        ),
      );
    }

    if (!imageAdapter.isConfigured()) {
      return Result.err(
        internalMessage("Image AI provider is not configured"),
      );
    }

    const finalPrompt = [trimmedPrompt, aiConfig.avatarStylePrompt].join("\n");
    try {
      const generated = await imageAdapter.generateImage(finalPrompt);
      if (userId !== undefined) {
        llmUsageService.recordImage({
          userId,
          llmSystemPromptId: null,
          model: imageAdapter.model,
          feature: "AVATAR_GENERATE",
        });
      }
      return Result.ok(generated);
    } catch (error) {
      return Result.err(internal(error, "Failed to generate avatar"));
    }
  },
};
