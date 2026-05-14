import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const imageAdapterMock = {
  editImage: vi.fn(),
  isConfigured: vi.fn(),
  model: "grok-imagine-image",
};

const llmUsageServiceMock = {
  recordImage: vi.fn(),
};

vi.mock("#config/ai.js", () => ({
  default: {
    maxPromptLength: 50,
    chatImageEditStylePrompt: "STYLE PROMPT",
  },
}));

vi.mock("#app/services/ai/ai-provider.js", () => ({
  imageAdapter: imageAdapterMock,
}));

vi.mock("#app/services/llm-usage-service.js", () => ({
  llmUsageService: llmUsageServiceMock,
}));

async function loadChatImageAiService() {
  return import("./chat-image-ai-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("chatImageAiService", () => {
  it("rejects missing file", async () => {
    const { chatImageAiService } = await loadChatImageAiService();
    const result = await chatImageAiService.editImage(undefined, "prompt");

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "BadRequest",
        message: "Image file is required",
      });
    }
  });

  it("rejects unsupported image type", async () => {
    imageAdapterMock.isConfigured.mockReturnValue(true);

    const { chatImageAiService } = await loadChatImageAiService();
    const result = await chatImageAiService.editImage(
      {
        filename: "photo.gif",
        type: "image/gif",
        data: new Uint8Array([1, 2, 3]),
      } as never,
      "prompt",
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "BadRequest",
        message: "Invalid image type. Allowed: jpeg, png, webp",
      });
    }
  });

  it("edits image and records usage", async () => {
    imageAdapterMock.isConfigured.mockReturnValue(true);
    imageAdapterMock.editImage.mockResolvedValue({
      imageBase64: "base64-image",
      mimeType: "image/png",
    });

    const { chatImageAiService } = await loadChatImageAiService();
    const result = await chatImageAiService.editImage(
      {
        filename: "photo.png",
        type: "image/png",
        data: new Uint8Array([1, 2, 3]),
      } as never,
      "Make it better",
      7n,
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        imageBase64: "base64-image",
        mimeType: "image/png",
      });
    }
    expect(imageAdapterMock.editImage).toHaveBeenCalledWith(
      expect.stringContaining("Make it better"),
      expect.stringMatching(/^data:image\/png;base64,/),
    );
    expect(llmUsageServiceMock.recordImage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7n,
        feature: "CHAT_IMAGE_EDIT",
        model: "grok-imagine-image",
      }),
    );
  });

  it("returns internal failure when provider throws", async () => {
    imageAdapterMock.isConfigured.mockReturnValue(true);
    imageAdapterMock.editImage.mockRejectedValue(new Error("provider down"));

    const { chatImageAiService } = await loadChatImageAiService();
    const result = await chatImageAiService.editImage(
      {
        filename: "photo.png",
        type: "image/png",
        data: new Uint8Array([1, 2, 3]),
      } as never,
      "Make it better",
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Internal",
        publicMessage: "Failed to edit image",
        cause: new Error("provider down"),
      });
    }
  });
});
