import { type } from '@arktype/type'

export const AdminUserSearchQuerySchema = type({
    email: 'string > 0',
})

export type AdminUserSearchQuery = typeof AdminUserSearchQuerySchema.infer
export type AdminUserSearchQueryInput = AdminUserSearchQuery

export const OAuthRedirectQuerySchema = type({})

export type OAuthRedirectQuery = typeof OAuthRedirectQuerySchema.infer
export type OAuthRedirectQueryInput = OAuthRedirectQuery

export const OAuthCallbackQuerySchema = type({
    'code?': 'string',
    'state?': 'string',
})

export type OAuthCallbackQuery = typeof OAuthCallbackQuerySchema.infer
export type OAuthCallbackQueryInput = OAuthCallbackQuery
