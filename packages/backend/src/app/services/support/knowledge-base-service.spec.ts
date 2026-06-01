import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const supportKnowledgeRepositoryMock = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findActiveAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  setScreenshot: vi.fn(),
  clearScreenshot: vi.fn(),
  setEmbedding: vi.fn(),
  clearEmbedding: vi.fn(),
};

const supportEmbeddingServiceMock = {
  indexArticle: vi.fn(() => Promise.resolve(undefined)),
  reindexAll: vi.fn(),
  search: vi.fn(),
};

const loggerMock = {
  error: vi.fn(),
  warn: vi.fn(),
};

const presignUrlMock = vi.fn();

vi.mock("#app/repositories/support/support-knowledge-repository.js", () => ({
  supportKnowledgeRepository: supportKnowledgeRepositoryMock,
}));

vi.mock("#app/services/support/support-embedding-service.js", () => ({
  supportEmbeddingService: supportEmbeddingServiceMock,
}));

vi.mock("#logger", () => ({
  default: loggerMock,
}));

vi.mock("#vendor/utils/storage/s3.js", () => ({
  uploadToS3: vi.fn(() => Promise.resolve(undefined)),
  deleteFromS3: vi.fn(() => Promise.resolve(undefined)),
  presignUrl: presignUrlMock,
}));

async function loadKnowledgeBaseService() {
  return import("./knowledge-base-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("knowledgeBaseService", () => {
  it("returns mapped articles for getAll", async () => {
    supportKnowledgeRepositoryMock.findAll.mockResolvedValue({
      rows: [
        {
          id: 1n,
          title: "Article 1",
          content: "Content 1",
          category: "support",
          isActive: true,
          screenshotKey: null,
          embeddingIndexed: false,
          createdAt: new Date("2026-05-08T10:00:00.000Z"),
          updatedAt: new Date("2026-05-08T11:00:00.000Z"),
        },
      ],
      total: 1,
    });

    const { knowledgeBaseService } = await loadKnowledgeBaseService();
    const result = await knowledgeBaseService.getAll({ page: 1, limit: 10 });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        items: [
          {
            id: "1",
            title: "Article 1",
            content: "Content 1",
            category: "support",
            isActive: true,
            hasScreenshot: false,
            screenshotKey: null,
            embeddingIndexed: false,
            createdAt: "2026-05-08T10:00:00.000Z",
            updatedAt: "2026-05-08T11:00:00.000Z",
          },
        ],
        total: 1,
      });
    }
  });

  it("returns internal error when getAll repository fails", async () => {
    supportKnowledgeRepositoryMock.findAll.mockRejectedValue(
      new Error("db down"),
    );

    const { knowledgeBaseService } = await loadKnowledgeBaseService();
    const result = await knowledgeBaseService.getAll({});

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Internal",
        publicMessage: "Failed to load knowledge base articles",
        cause: expect.any(Error),
      });
    }
  });

  it("returns not found for missing article", async () => {
    supportKnowledgeRepositoryMock.findById.mockResolvedValue(undefined);

    const { knowledgeBaseService } = await loadKnowledgeBaseService();
    const result = await knowledgeBaseService.getById(11n);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "NotFound",
        resource: "Article",
        message: "Article not found",
      });
    }
  });

  it("creates an article and triggers indexing", async () => {
    supportKnowledgeRepositoryMock.create.mockResolvedValue({
      id: 5n,
      title: "New Article",
      content: "Body",
      category: "support",
      isActive: true,
      screenshotKey: null,
      embeddingIndexed: false,
      createdAt: new Date("2026-05-08T10:00:00.000Z"),
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    supportKnowledgeRepositoryMock.findById.mockResolvedValue({
      id: 5n,
      title: "New Article",
      content: "Body",
      category: "support",
      isActive: true,
      screenshotKey: null,
      embeddingIndexed: true,
      createdAt: new Date("2026-05-08T10:00:00.000Z"),
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });

    const { knowledgeBaseService } = await loadKnowledgeBaseService();
    const result = await knowledgeBaseService.create({
      title: "New Article",
      content: "Body",
      category: "support",
      isActive: true,
    });

    expect(Result.isOk(result)).toBe(true);
    expect(supportEmbeddingServiceMock.indexArticle).toHaveBeenCalledWith(
      5n,
      "New Article",
      "Body",
    );
    if (Result.isOk(result)) {
      expect(result.value.item).toMatchObject({
        id: "5",
        title: "New Article",
        content: "Body",
      });
    }
  });

  it("uploads a screenshot and returns updated article", async () => {
    supportKnowledgeRepositoryMock.findById.mockResolvedValue({
      id: 11n,
      title: "Article",
      content: "Content",
      category: null,
      isActive: true,
      screenshotKey: null,
      embeddingIndexed: true,
      createdAt: new Date("2026-05-08T10:00:00.000Z"),
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    supportKnowledgeRepositoryMock.setScreenshot.mockResolvedValue(undefined);

    const { knowledgeBaseService } = await loadKnowledgeBaseService();
    const result = await knowledgeBaseService.uploadScreenshot(11n, {
      name: "screenshot.png",
      filename: "screenshot.png",
      type: "image/png",
      data: new Uint8Array([1, 2, 3]).buffer,
    });

    expect(Result.isOk(result)).toBe(true);
    expect(supportKnowledgeRepositoryMock.setScreenshot).toHaveBeenCalledWith(
      11n,
      expect.stringContaining("knowledge-base/11/"),
      "image/png",
    );
    if (Result.isOk(result)) {
      expect(result.value.item).toMatchObject({
        id: "11",
        hasScreenshot: true,
        screenshotKey: expect.stringContaining("knowledge-base/11/"),
      });
    }
  });

  it("returns not found for deleteScreenshot on missing article", async () => {
    supportKnowledgeRepositoryMock.findById.mockResolvedValue(undefined);

    const { knowledgeBaseService } = await loadKnowledgeBaseService();
    const result = await knowledgeBaseService.deleteScreenshot(11n);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "NotFound",
        resource: "Article",
        message: "Article not found",
      });
    }
  });

  it("returns a presigned screenshot url", async () => {
    supportKnowledgeRepositoryMock.findById.mockResolvedValue({
      id: 11n,
      title: "Article",
      content: "Content",
      category: null,
      isActive: true,
      screenshotKey: "kb/11/screenshot.png",
      embeddingIndexed: true,
      createdAt: new Date("2026-05-08T10:00:00.000Z"),
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    presignUrlMock.mockResolvedValue("https://signed-url");

    const { knowledgeBaseService } = await loadKnowledgeBaseService();
    const result = await knowledgeBaseService.getScreenshotUrl(11n);

    expect(Result.isOk(result)).toBe(true);
    expect(presignUrlMock).toHaveBeenCalledWith(
      "kb/11/screenshot.png",
      300,
    );
    if (Result.isOk(result)) {
      expect(result.value).toEqual({ signedUrl: "https://signed-url" });
    }
  });

  it("returns internal error when screenshot presign fails", async () => {
    supportKnowledgeRepositoryMock.findById.mockResolvedValue({
      id: 11n,
      title: "Article",
      content: "Content",
      category: null,
      isActive: true,
      screenshotKey: "kb/11/screenshot.png",
      embeddingIndexed: true,
      createdAt: new Date("2026-05-08T10:00:00.000Z"),
      updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    });
    presignUrlMock.mockRejectedValue(new Error("presign failed"));

    const { knowledgeBaseService } = await loadKnowledgeBaseService();
    const result = await knowledgeBaseService.getScreenshotUrl(11n);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Internal",
        publicMessage: "Failed to presign screenshot URL",
        cause: expect.any(Error),
      });
    }
  });
});
