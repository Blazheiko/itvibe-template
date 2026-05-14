import { type } from '@arktype/type';

const OAuthRedirectStatus = type.enumerated('redirect', 'error');
export const OAuthRedirectResponseSchema = type({
  status: OAuthRedirectStatus,
  'message?': 'string',
});
export type OAuthRedirectResponse = typeof OAuthRedirectResponseSchema.infer;

const OAuthCallbackStatus = type.enumerated('success', 'error');
export const OAuthCallbackResponseSchema = type({
  status: OAuthCallbackStatus,
  'message?': 'string',
});
export type OAuthCallbackResponse = typeof OAuthCallbackResponseSchema.infer;
