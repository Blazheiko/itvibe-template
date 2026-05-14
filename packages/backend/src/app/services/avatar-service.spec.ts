import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const userRepositoryMock = {
  findById: vi.fn(),
  update: vi.fn(),
};

const uploadToS3Mock = vi.fn();
const deleteFromS3Mock = vi.fn();

const imageAdapterMock = {
  isConfigured: vi.fn(),
  generateImage: vi.fn(),
  model: "mock-model",
};

const llmUsageServiceMock = {
  recordImage: vi.fn(),
};

const loggerMock = {
  warn: vi.fn(),
};

vi.mock("#app/repositories/index.js", () => ({
  userRepository: userRepositoryMock,
}));

vi.mock("#vendor/utils/storage/s3.js", () => ({
  uploadToS3: uploadToS3Mock,
  deleteFromS3: deleteFromS3Mock,
}));

vi.mock("#app/services/ai/ai-provider.js", () => ({
  imageAdapter: imageAdapterMock,
}));

vi.mock("#app/services/llm-usage-service.js", () => ({
  llmUsageService: llmUsageServiceMock,
}));

vi.mock("#logger", () => ({
  default: loggerMock,
}));

async function loadAvatarService() {
  return import("./avatar-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("avatarService", () => {
  it("uploads an avatar", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      name: "Alice",
      email: "alice@example.com",
      avatar: null,
    });
    uploadToS3Mock.mockResolvedValue(undefined);
    userRepositoryMock.update.mockResolvedValue({
      id: 7n,
      name: "Alice",
      email: "alice@example.com",
      avatar: "avatars/7/avatar.webp",
    });

    const { avatarService } = await loadAvatarService();
    const result = await avatarService.uploadAvatar(7n, {
      filename: "avatar",
      type: "image/webp",
      data: new Uint8Array([1, 2, 3]).buffer,
    } as never);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.user).toEqual({
        id: "7",
        name: "Alice",
        email: "alice@example.com",
        avatar: "avatars/7/avatar.webp",
      });
    }
  });

  it("logs best-effort avatar cleanup failures without failing upload", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      name: "Alice",
      email: "alice@example.com",
      avatar: "avatars/7/old.webp",
    });
    uploadToS3Mock.mockResolvedValue(undefined);
    deleteFromS3Mock.mockRejectedValue(new Error("S3 delete failed"));
    userRepositoryMock.update.mockResolvedValue({
      id: 7n,
      name: "Alice",
      email: "alice@example.com",
      avatar: "avatars/7/new.webp",
    });

    const { avatarService } = await loadAvatarService();
    const result = await avatarService.uploadAvatar(7n, {
      filename: "avatar.webp",
      type: "image/webp",
      data: new Uint8Array([1, 2, 3]).buffer,
    } as never);

    expect(Result.isOk(result)).toBe(true);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        oldAvatarKey: "avatars/7/old.webp",
        err: expect.objectContaining({
          _tag: "Internal",
          publicMessage: "Failed to delete old avatar",
        }),
      }),
      "Failed to delete old avatar S3 object",
    );
  });

  it("returns not found for missing user on deleteAvatar", async () => {
    userRepositoryMock.findById.mockResolvedValue(undefined);

    const { avatarService } = await loadAvatarService();
    const result = await avatarService.deleteAvatar(7n);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "NotFound",
        resource: "User",
        message: "User not found",
      });
    }
  });

  it("generates an avatar with ai", async () => {
    imageAdapterMock.isConfigured.mockReturnValue(true);
    imageAdapterMock.generateImage.mockResolvedValue({
      imageBase64: "base64",
      mimeType: "image/png",
    });

    const { avatarService } = await loadAvatarService();
    const result = await avatarService.generateAvatarWithAi("cat portrait", 7n);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        imageBase64: "base64",
        mimeType: "image/png",
      });
    }
    expect(llmUsageServiceMock.recordImage).toHaveBeenCalled();
  });

  it("returns a generic internal message when avatar generation fails", async () => {
    imageAdapterMock.isConfigured.mockReturnValue(true);
    imageAdapterMock.generateImage.mockRejectedValue(new Error("API key leaked"));

    const { avatarService } = await loadAvatarService();
    const result = await avatarService.generateAvatarWithAi("cat portrait", 7n);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Internal",
        publicMessage: "Failed to generate avatar",
        cause: new Error("API key leaked"),
      });
    }
  });
});
