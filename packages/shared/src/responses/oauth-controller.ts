import { type } from '@arktype/type'

const OAuthRedirectStatus = type.enumerated('redirect', 'error')
export const OAuthRedirectResponseSchema = type({
    status: OAuthRedirectStatus,
    'message?': 'string',
})
export type OAuthRedirectResponse = typeof OAuthRedirectResponseSchema.infer

const OAuthCallbackStatus = type.enumerated('success', 'error')
export const OAuthCallbackResponseSchema = type({
    status: OAuthCallbackStatus,
    'message?': 'string',
})
export type OAuthCallbackResponse = typeof OAuthCallbackResponseSchema.infer

// Providers whose client id, secret and redirect URI are all set on the backend.
export const OAuthProviderSchema = type.enumerated('google', 'facebook', 'github', 'gitlab')
export type OAuthProvider = typeof OAuthProviderSchema.infer

export const OAuthProvidersResponseSchema = type({
    status: "'ok'",
    providers: OAuthProviderSchema.array(),
})
export type OAuthProvidersResponse = typeof OAuthProvidersResponseSchema.infer
