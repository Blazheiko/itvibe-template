import { type } from '@arktype/type';
import { CanonicalErrorResponseSchema } from './error-response.js';

export const SupportChatResponseSchema = type.or(
    { status: "'ok'", 'message?': 'string' },
    CanonicalErrorResponseSchema,
);
export type SupportChatResponse = typeof SupportChatResponseSchema.infer;

export const SupportOpenChatResponseSchema = type.or(
    { status: "'ok'", 'message?': 'string' },
    CanonicalErrorResponseSchema,
);
export type SupportOpenChatResponse = typeof SupportOpenChatResponseSchema.infer;

export const SupportGetChatHistoryResponseSchema = type.or(
    { status: "'ok'", 'message?': 'string', 'data?': 'unknown[]' },
    CanonicalErrorResponseSchema,
);
export type SupportGetChatHistoryResponse = typeof SupportGetChatHistoryResponseSchema.infer;

export const SupportDeleteChatHistoryResponseSchema = type.or(
    { status: "'ok'", 'message?': 'string' },
    CanonicalErrorResponseSchema,
);
export type SupportDeleteChatHistoryResponse = typeof SupportDeleteChatHistoryResponseSchema.infer;

export const SupportKnowledgeBaseListResponseSchema = type.or(
    { status: "'ok'", 'message?': 'string', 'data?': 'unknown[]', 'total?': 'number' },
    CanonicalErrorResponseSchema,
);
export type SupportKnowledgeBaseListResponse = typeof SupportKnowledgeBaseListResponseSchema.infer;

export const SupportKnowledgeBaseItemResponseSchema = type.or(
    { status: "'ok'", 'message?': 'string', 'data?': 'unknown' },
    CanonicalErrorResponseSchema,
);
export type SupportKnowledgeBaseItemResponse = typeof SupportKnowledgeBaseItemResponseSchema.infer;

export const SupportKnowledgeBaseDeleteResponseSchema = type.or(
    { status: "'ok'", 'message?': 'string' },
    CanonicalErrorResponseSchema,
);
export type SupportKnowledgeBaseDeleteResponse = typeof SupportKnowledgeBaseDeleteResponseSchema.infer;

export const SupportKnowledgeBaseReindexResponseSchema = type.or(
    { status: "'ok'", 'message?': 'string', 'indexed?': 'number' },
    CanonicalErrorResponseSchema,
);
export type SupportKnowledgeBaseReindexResponse = typeof SupportKnowledgeBaseReindexResponseSchema.infer;

export const SupportKnowledgeBaseInitJobSchema = type({
    state: "'idle' | 'running' | 'completed' | 'failed'",
    totalFiles: 'number',
    processedFiles: 'number',
    createdArticles: 'number',
    failedFiles: 'number',
    progressPercent: 'number',
    currentFile: 'string | null',
    startedAt: 'string | null',
    completedAt: 'string | null',
    message: 'string | null',
});
export type SupportKnowledgeBaseInitJob = typeof SupportKnowledgeBaseInitJobSchema.infer;

export const SupportKnowledgeBaseInitResponseSchema = type.or(
    { status: "'ok'", 'message?': 'string', 'data?': SupportKnowledgeBaseInitJobSchema },
    type.and(CanonicalErrorResponseSchema, { 'data?': SupportKnowledgeBaseInitJobSchema }),
);
export type SupportKnowledgeBaseInitResponse = typeof SupportKnowledgeBaseInitResponseSchema.infer;
