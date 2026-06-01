import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const supportRepositoryMock = {
  findChatHistory: vi.fn(),
  deleteAllChatHistory: vi.fn(),
  addChatMessage: vi.fn(),
};

const supportEmbeddingServiceMock = {
  search: vi.fn(),
};

const supportLlmServiceMock = {
  openChatStream: vi.fn(),
  chatStream: vi.fn(),
};

const supportQueryTranslationServiceMock = {
  translateToEnglish: vi.fn(),
};

const broadcastServiceMock = {
  broadcastMessageToUser: vi.fn(),
  broadcastMessageToUserConnection: vi.fn(),
};

const llmUsageServiceMock = {
  recordText: vi.fn(),
};

const promptServiceMock = {
  get: vi.fn(() => ({ id: "prompt-id" })),
};

const loggerMock = {
  error: vi.fn(),
};

vi.mock("#app/repositories/support/support-repository.js", () => ({
  supportRepository: supportRepositoryMock,
}));

vi.mock("#app/services/support/support-embedding-service.js", () => ({
  supportEmbeddingService: supportEmbeddingServiceMock,
}));

vi.mock("#app/services/support/support-llm-service.js", () => ({
  supportLlmService: supportLlmServiceMock,
}));

vi.mock("#app/services/support/support-query-translation-service.js", () => ({
  supportQueryTranslationService: supportQueryTranslationServiceMock,
}));

vi.mock("#app/services/communication/broadcast-service.js", () => ({
  broadcastService: broadcastServiceMock,
}));

vi.mock("#app/services/ai/usage/llm-usage-service.js", () => ({
  llmUsageService: llmUsageServiceMock,
}));

vi.mock("#app/services/ai/prompt-service.js", () => ({
  promptService: promptServiceMock,
}));

vi.mock("#logger", () => ({
  default: loggerMock,
}));

async function loadSupportService() {
  return import("./support-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("supportService", () => {
  it("returns mapped chat history", async () => {
    supportRepositoryMock.findChatHistory.mockResolvedValue([
      {
        id: 1n,
        role: "assistant",
        content: "Hello",
        screenshots: ["1", "2"],
        createdAt: new Date("2026-05-08T10:00:00.000Z"),
      },
    ]);

    const { supportService } = await loadSupportService();
    const result = await supportService.getChatHistory(11n);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        data: [
          {
            id: "1",
            role: "assistant",
            content: "Hello",
            screenshots: ["1", "2"],
            createdAt: "2026-05-08T10:00:00.000Z",
          },
        ],
      });
    }
  });

  it("returns internal error when deleting chat history fails", async () => {
    supportRepositoryMock.deleteAllChatHistory.mockRejectedValue(
      new Error("db down"),
    );

    const { supportService } = await loadSupportService();
    const result = await supportService.deleteChatHistory(11n);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Internal",
        publicMessage: "Failed to delete chat history",
        cause: expect.any(Error),
      });
    }
  });
});
