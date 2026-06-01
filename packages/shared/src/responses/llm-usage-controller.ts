import { type } from '@arktype/type';

export const GetTextUsageResponseSchema = type({
    status: "'success' | 'error'",
    'message?': 'string',
    'data?': {
        rows: 'unknown[]',
        total: 'number',
        page: 'number',
        limit: 'number',
    },
});
export type GetTextUsageResponse = typeof GetTextUsageResponseSchema.infer;

export const GetUsageStatsResponseSchema = type({
    status: "'success' | 'error'",
    'message?': 'string',
    'data?': {
        text: 'unknown[]',
    },
});
export type GetUsageStatsResponse = typeof GetUsageStatsResponseSchema.infer;
