import { type } from '@arktype/type';

export const PromptGetListResponseSchema = type({
    status: "'success' | 'error'",
    'message?': 'string',
    'data?': 'unknown[]',
});
export type PromptGetListResponse = typeof PromptGetListResponseSchema.infer;

export const PromptGetByTypeResponseSchema = type({
    status: "'success' | 'error'",
    'message?': 'string',
    'data?': 'unknown',
});
export type PromptGetByTypeResponse = typeof PromptGetByTypeResponseSchema.infer;

export const PromptUpdateResponseSchema = type({
    status: "'success' | 'error'",
    'message?': 'string',
});
export type PromptUpdateResponse = typeof PromptUpdateResponseSchema.infer;

export const PromptTestResponseSchema = type({
    status: "'success' | 'error'",
    'message?': 'string',
    'result?': 'string',
});
export type PromptTestResponse = typeof PromptTestResponseSchema.infer;
