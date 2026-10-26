import { type } from '@arktype/type'
import { CanonicalErrorResponseSchema, type WithCanonicalError } from './error-response.js'

export const AdminUserListItemSchema = type({
    id: 'string',
    name: 'string',
    email: 'string',
    registeredAt: 'string',
})
export type AdminUserListItem = typeof AdminUserListItemSchema.infer

export const AdminUserListResponseSchema = type.or(
    { status: "'success'", items: AdminUserListItemSchema.array(), total: 'number' },
    CanonicalErrorResponseSchema,
)
export type AdminUserListResponse = WithCanonicalError<typeof AdminUserListResponseSchema.infer>
