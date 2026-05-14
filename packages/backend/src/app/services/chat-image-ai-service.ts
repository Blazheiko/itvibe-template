import aiConfig from "#config/ai.js";
import type { UploadedFile } from "#vendor/types/types.js";
import { Result } from "better-result";
import { imageAdapter } from "#app/services/ai/ai-provider.js";
import { llmUsageService } from "#app/services/llm-usage-service.js";
import {
  badRequest,
  internal,
  internalMessage,
  type AppResult,
} from "#app/services/shared/errors.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface EditedImagePayload {
  imageBase64: string;
  mimeType: string;
}

export const chatImageAiService = {
  async editImage(
    imageFile: UploadedFile | undefined,
    prompt: string,
    userId?: bigint,
  ): Promise<AppResult<EditedImagePayload>> {
    if (imageFile === undefined) {
      return Result.err(badRequest("Image file is required"));
    }

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
    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      return Result.err(
        badRequest("Invalid image type. Allowed: jpeg, png, webp"),
      );
    }
    if (imageFile.data.byteLength <= 0 || imageFile.data.byteLength > MAX_FILE_SIZE) {
      return Result.err(
        badRequest("Image size must be between 1 byte and 10 MB"),
      );
    }

    if (!imageAdapter.isConfigured()) {
      return Result.err(internalMessage("Image AI provider is not configured"));
    }

    const finalPrompt = [
      trimmedPrompt,
      aiConfig.chatImageEditStylePrompt,
    ].join("\n");

    const imageBase64 = Buffer.from(imageFile.data).toString("base64");
    const imageDataUrl = `data:${imageFile.type};base64,${imageBase64}`;

    try {
      const edited = await imageAdapter.editImage(finalPrompt, imageDataUrl);
      if (userId !== undefined) {
        llmUsageService.recordImage({
          userId,
          llmSystemPromptId: null,
          model: imageAdapter.model,
          feature: "CHAT_IMAGE_EDIT",
        });
      }
      return Result.ok(edited);
    } catch (error) {
      return Result.err(internal(error, "Failed to edit image"));
    }
  },
};
