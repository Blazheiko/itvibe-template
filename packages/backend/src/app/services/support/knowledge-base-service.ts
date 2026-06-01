import { randomUUID } from "node:crypto";
import type { UploadedFile } from "#vendor/types/types.js";
import diskConfig from "#config/disk.js";
import { supportKnowledgeRepository } from "#app/repositories/support/support-knowledge-repository.js";
import type { KbArticleRow, KbRow } from "#app/repositories/support/support-knowledge-repository.js";
import { supportEmbeddingService } from "#app/services/support/support-embedding-service.js";
import { deleteFromS3, uploadToS3 } from "#vendor/utils/storage/s3.js";
import logger from "#logger";
import { Result } from "better-result";
import {
  badRequest,
  notFound,
  type AppResult,
  internalMessage,
} from "#app/services/shared/errors.js";
import { tryInternal } from "#app/services/shared/result-helpers.js";
import { presignUrl } from "#vendor/utils/storage/s3.js";

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_SCREENSHOT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function buildFullS3Key(key: string): string {
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");
  return `${prefix}/${s3DynamicDataPrefix}/${key}`;
}

function getExtFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export interface KbItemData {
  id: string;
  title: string;
  content: string;
  category: string | null;
  isActive: boolean;
  hasScreenshot: boolean;
  screenshotKey: string | null;
  embeddingIndexed: boolean;
  createdAt: string;
  updatedAt: string;
}

function rowToData(row: KbArticleRow | (KbRow & { embeddingIndexed: boolean })): KbItemData {
  return {
    id: String(row.id),
    title: row.title,
    content: row.content,
    category: row.category,
    isActive: row.isActive,
    hasScreenshot: row.screenshotKey !== null,
    screenshotKey: row.screenshotKey,
    embeddingIndexed: row.embeddingIndexed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const knowledgeBaseService = {
  async getAll(opts: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<AppResult<{ items: KbItemData[]; total: number }>> {
    const limit = opts.limit ?? 50;
    const offset = ((opts.page ?? 1) - 1) * limit;
    const result = await tryInternal(
      () =>
        supportKnowledgeRepository.findAll({
          ...(opts.category !== undefined ? { category: opts.category } : {}),
          limit,
          offset,
        }),
      "Failed to load knowledge base articles",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }

    return Result.ok({
      items: result.value.rows.map(rowToData),
      total: result.value.total,
    });
  },

  async getById(id: bigint): Promise<AppResult<{ item: KbItemData }>> {
    const result = await tryInternal(
      () => supportKnowledgeRepository.findById(id),
      "Failed to load knowledge base article",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }

    if (result.value === undefined) {
      return Result.err(notFound("Article", "Article not found"));
    }
    return Result.ok({ item: rowToData(result.value) });
  },

  async create(data: {
    title: string;
    content: string;
    category?: string | null;
    isActive?: boolean;
  }): Promise<AppResult<{ item: KbItemData }>> {
    const result = await tryInternal(
      () => supportKnowledgeRepository.create(data),
      "Failed to create knowledge base article",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }

    void supportEmbeddingService
      .indexArticle(result.value.id, result.value.title, result.value.content)
      .catch((err: unknown) => {
        logger.error(
          { err, articleId: String(result.value.id) },
          "Failed to index new KB article",
        );
      });
    return Result.ok({
      item: rowToData({
        ...result.value,
        embeddingIndexed: false,
      }),
    });
  },

  async update(
    id: bigint,
    data: {
      title?: string;
      content?: string;
      category?: string | null;
      isActive?: boolean;
    },
  ): Promise<AppResult<{ item: KbItemData }>> {
    const existingResult = await tryInternal(
      () => supportKnowledgeRepository.findById(id),
      "Failed to load knowledge base article",
    );
    if (Result.isError(existingResult)) {
      return Result.err(existingResult.error);
    }

    const existing = existingResult.value;
    if (existing === undefined) {
      return Result.err(notFound("Article", "Article not found"));
    }

    const updatedResult = await tryInternal(
      () => supportKnowledgeRepository.update(id, data),
      "Failed to update knowledge base article",
    );
    if (Result.isError(updatedResult)) {
      return Result.err(updatedResult.error);
    }

    if (updatedResult.value === undefined) {
      return Result.err(internalMessage("Failed to update article"));
    }

    if (data.title !== undefined || data.content !== undefined) {
      void supportEmbeddingService
        .indexArticle(
          updatedResult.value.id,
          updatedResult.value.title,
          updatedResult.value.content,
        )
        .catch((err: unknown) => {
          logger.error(
            { err, articleId: String(id) },
            "Failed to re-index KB article",
          );
        });
    }
    return Result.ok({
      item: rowToData({
        ...updatedResult.value,
        embeddingIndexed: existing.embeddingIndexed,
      }),
    });
  },

  async delete(id: bigint): Promise<AppResult<void>> {
    const existingResult = await tryInternal(
      () => supportKnowledgeRepository.findById(id),
      "Failed to load knowledge base article",
    );
    if (Result.isError(existingResult)) {
      return Result.err(existingResult.error);
    }

    const existing = existingResult.value;
    if (existing === undefined) {
      return Result.err(notFound("Article", "Article not found"));
    }

    if (existing.screenshotKey !== null) {
      const screenshotKey = existing.screenshotKey;
      const deleteScreenshotResult = await tryInternal(
        () => deleteFromS3(buildFullS3Key(screenshotKey)),
        "Failed to delete KB screenshot from S3",
      );
      if (Result.isError(deleteScreenshotResult)) {
        logger.warn(
          { err: deleteScreenshotResult.error, key: screenshotKey },
          "Failed to delete KB screenshot from S3",
        );
      }
    }

    const deletedResult = await tryInternal(
      () => supportKnowledgeRepository.delete(id),
      "Failed to delete knowledge base article",
    );
    if (Result.isError(deletedResult)) {
      return Result.err(deletedResult.error);
    }

    return Result.ok(undefined);
  },

  async uploadScreenshot(
    id: bigint,
    file: UploadedFile | undefined,
  ): Promise<AppResult<{ item: KbItemData }>> {
    if (file === undefined) {
      return Result.err(badRequest("No file uploaded"));
    }
    if (file.data.byteLength > MAX_SCREENSHOT_SIZE) {
      return Result.err(badRequest("File size exceeds 5 MB limit"));
    }
    if (!ALLOWED_SCREENSHOT_TYPES.has(file.type)) {
      return Result.err(
        badRequest("Invalid file type. Allowed: png, jpeg, webp"),
      );
    }

    const existingResult = await tryInternal(
      () => supportKnowledgeRepository.findById(id),
      "Failed to load knowledge base article",
    );
    if (Result.isError(existingResult)) {
      return Result.err(existingResult.error);
    }

    const existing = existingResult.value;
    if (existing === undefined) {
      return Result.err(notFound("Article", "Article not found"));
    }

    if (existing.screenshotKey !== null) {
      const screenshotKey = existing.screenshotKey;
      const deleteScreenshotResult = await tryInternal(
        () => deleteFromS3(buildFullS3Key(screenshotKey)),
        "Failed to delete old KB screenshot",
      );
      if (Result.isError(deleteScreenshotResult)) {
        logger.warn(
          { err: deleteScreenshotResult.error },
          "Failed to delete old KB screenshot",
        );
      }
    }

    const ext = getExtFromMime(file.type);
    const s3Key = `knowledge-base/${String(id)}/${randomUUID()}.${ext}`;
    const uploadResult = await tryInternal(
      () => uploadToS3(s3Key, Buffer.from(file.data), file.type),
      "Failed to upload knowledge base screenshot",
    );
    if (Result.isError(uploadResult)) {
      return Result.err(uploadResult.error);
    }

    const setScreenshotResult = await tryInternal(
      () => supportKnowledgeRepository.setScreenshot(id, s3Key, file.type),
      "Failed to update knowledge base screenshot",
    );
    if (Result.isError(setScreenshotResult)) {
      return Result.err(setScreenshotResult.error);
    }

    return Result.ok({
      item: rowToData({
        ...existing,
        screenshotKey: s3Key,
        screenshotMime: file.type,
        updatedAt: new Date(),
        embeddingIndexed: existing.embeddingIndexed,
      }),
    });
  },

  async deleteScreenshot(id: bigint): Promise<AppResult<{ item: KbItemData }>> {
    const existingResult = await tryInternal(
      () => supportKnowledgeRepository.findById(id),
      "Failed to load knowledge base article",
    );
    if (Result.isError(existingResult)) {
      return Result.err(existingResult.error);
    }

    const existing = existingResult.value;
    if (existing === undefined) {
      return Result.err(notFound("Article", "Article not found"));
    }

    if (existing.screenshotKey !== null) {
      const screenshotKey = existing.screenshotKey;
      const deleteScreenshotResult = await tryInternal(
        () => deleteFromS3(buildFullS3Key(screenshotKey)),
        "Failed to delete KB screenshot from S3",
      );
      if (Result.isError(deleteScreenshotResult)) {
        logger.warn(
          { err: deleteScreenshotResult.error },
          "Failed to delete KB screenshot from S3",
        );
      }
    }

    const clearResult = await tryInternal(
      () => supportKnowledgeRepository.clearScreenshot(id),
      "Failed to clear knowledge base screenshot",
    );
    if (Result.isError(clearResult)) {
      return Result.err(clearResult.error);
    }

    return Result.ok({
      item: rowToData({
        ...existing,
        screenshotKey: null,
        screenshotMime: null,
        updatedAt: new Date(),
        embeddingIndexed: existing.embeddingIndexed,
      }),
    });
  },

  async getScreenshotKey(articleId: bigint): Promise<AppResult<string | null>> {
    const result = await tryInternal(
      () => supportKnowledgeRepository.findById(articleId),
      "Failed to load knowledge base article",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }
    return Result.ok(result.value?.screenshotKey ?? null);
  },

  async getScreenshotUrl(
    articleId: bigint,
  ): Promise<AppResult<{ signedUrl: string | null }>> {
    const screenshotKeyResult = await knowledgeBaseService.getScreenshotKey(
      articleId,
    );
    if (Result.isError(screenshotKeyResult)) {
      return Result.err(screenshotKeyResult.error);
    }

    const screenshotKey = screenshotKeyResult.value;
    if (screenshotKey === null) {
      return Result.ok({ signedUrl: null });
    }

    const signedUrlResult = await tryInternal(
      () => presignUrl(screenshotKey, 300),
      "Failed to presign screenshot URL",
    );
    if (Result.isError(signedUrlResult)) {
      return Result.err(signedUrlResult.error);
    }

    return Result.ok({ signedUrl: signedUrlResult.value });
  },

  async reindexArticle(id: bigint): Promise<AppResult<{ indexed: number }>> {
    const result = await tryInternal(
      () => supportKnowledgeRepository.findById(id),
      "Failed to load knowledge base article",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }
    const row = result.value;
    if (row === undefined) {
      return Result.err(notFound("Article", "Article not found"));
    }

    const indexResult = await tryInternal(
      () =>
        supportEmbeddingService.indexArticle(row.id, row.title, row.content),
      "Failed to reindex knowledge base article",
    );
    if (Result.isError(indexResult)) {
      return Result.err(indexResult.error);
    }

    return Result.ok({ indexed: 1 });
  },

  async reindexAll(): Promise<AppResult<{ indexed: number }>> {
    const result = await tryInternal(
      () => supportEmbeddingService.reindexAll(),
      "Failed to reindex knowledge base articles",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }
    const indexed = result.value;
    if (indexed === undefined) {
      return Result.err(
        internalMessage("Failed to reindex knowledge base articles"),
      );
    }

    return Result.ok({ indexed });
  },
};
