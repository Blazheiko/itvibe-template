import { type } from '@arktype/type'
import { CanonicalErrorResponseSchema, type WithCanonicalError } from './error-response.js'

export const AdminOnlineHistoryListItemSchema = type({
    id: 'string',
    userId: 'string',
    name: 'string',
    email: 'string',
    appType: "'web' | 'pwa' | null",
    connectedAt: 'string',
    disconnectedAt: 'string | null',
    connectionDurationMs: 'number | null',
    closeCode: 'number | null',
    isFirstConnection: 'boolean',
    isLastConnection: 'boolean | null',
    userAgent: 'string | null',
    ipAddress: 'string | null',
})
export type AdminOnlineHistoryListItem = typeof AdminOnlineHistoryListItemSchema.infer

export const AdminOnlineHistoryListResponseSchema = type.or(
    {
        status: "'success'",
        items: AdminOnlineHistoryListItemSchema.array(),
        total: 'number',
        limit: 'number',
        nextCursor: 'string | null',
        hasMore: 'boolean',
    },
    CanonicalErrorResponseSchema,
)
export type AdminOnlineHistoryListResponse = WithCanonicalError<
    typeof AdminOnlineHistoryListResponseSchema.infer
>
