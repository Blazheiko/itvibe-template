import { type } from '@arktype/type'
import { CanonicalErrorResponseSchema } from './error-response.js'

// A prompt row as llm_system_prompts stores it (prompt-repository.ts PromptRow).
export const PromptRowSchema = type({
    id: 'bigint',
    type: "'SUPPORT_SYSTEM' | 'SUPPORT_FIRST_CHAT' | 'SUPPORT_QUERY_TRANSLATION'",
    topic: 'string | null',
    content: 'string',
    model: 'string | null',
    temperature: 'number | null',
    maxTokens: 'number | null',
    createdAt: 'Date',
    updatedAt: 'Date',
})
export type PromptRowResponse = typeof PromptRowSchema.infer

export const PromptGetListResponseSchema = type.or(
    { status: "'success'", 'message?': 'string', 'data?': PromptRowSchema.array() },
    CanonicalErrorResponseSchema,
)
export type PromptGetListResponse = typeof PromptGetListResponseSchema.infer

export const PromptGetByTypeResponseSchema = type.or(
    { status: "'success'", 'message?': 'string', 'data?': PromptRowSchema },
    CanonicalErrorResponseSchema,
)
export type PromptGetByTypeResponse = typeof PromptGetByTypeResponseSchema.infer

export const PromptUpdateResponseSchema = type.or(
    { status: "'success'", 'message?': 'string' },
    CanonicalErrorResponseSchema,
)
export type PromptUpdateResponse = typeof PromptUpdateResponseSchema.infer

export const PromptTestResponseSchema = type.or(
    { status: "'success'", 'message?': 'string', 'result?': 'string' },
    CanonicalErrorResponseSchema,
)
export type PromptTestResponse = typeof PromptTestResponseSchema.infer
