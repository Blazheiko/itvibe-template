import type {
  ChangePasswordInput,
  ChangePasswordResponse,
  EmptyFormInput,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  LoginInput,
  LoginResponse,
  OAuthCallbackQueryInput,
  OAuthRedirectQueryInput,
  RegisterInput,
  RegisterResponse,
  LogoutAllResponse,
  LogoutResponse,
  ResendVerificationEmailResponse,
  ResetPasswordInput,
  ResetPasswordResponse,
  VerifyEmailInput,
  VerifyEmailResponse,
} from 'shared'
import { createApiPath, requestJson } from './http'

type SuccessResponse<T extends { status: string }> = Exclude<T, { status: 'error' }>
type EmptyPayload = EmptyFormInput | Record<string, never>
type AuthUserPayload = Extract<LoginResponse, { status: 'success' }>['user']

export const OAUTH_PROVIDERS = ['google', 'github', 'gitlab'] as const
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]
export type AuthUser = Exclude<AuthUserPayload, undefined>

const AUTH_BASE_PATH = '/auth'
const OAUTH_BASE_PATH = '/auth/oauth'

export const authApi = {
  register(input: RegisterInput) {
    return requestJson<SuccessResponse<RegisterResponse>, RegisterInput>({
      method: 'POST',
      path: `${AUTH_BASE_PATH}/register`,
      body: input,
    })
  },

  login(input: LoginInput) {
    return requestJson<SuccessResponse<LoginResponse>, LoginInput>({
      method: 'POST',
      path: `${AUTH_BASE_PATH}/login`,
      body: input,
    })
  },

  logout(input: EmptyPayload = {}) {
    return requestJson<SuccessResponse<LogoutResponse>, EmptyPayload>({
      method: 'POST',
      path: `${AUTH_BASE_PATH}/logout`,
      body: input,
    })
  },

  logoutAll(input: EmptyPayload = {}) {
    return requestJson<SuccessResponse<LogoutAllResponse>, EmptyPayload>({
      method: 'POST',
      path: `${AUTH_BASE_PATH}/logout-all`,
      body: input,
    })
  },

  changePassword(input: ChangePasswordInput) {
    return requestJson<SuccessResponse<ChangePasswordResponse>, ChangePasswordInput>({
      method: 'POST',
      path: `${AUTH_BASE_PATH}/change-password`,
      body: input,
    })
  },

  forgotPassword(input: ForgotPasswordInput) {
    return requestJson<SuccessResponse<ForgotPasswordResponse>, ForgotPasswordInput>({
      method: 'POST',
      path: `${AUTH_BASE_PATH}/forgot-password`,
      body: input,
    })
  },

  resetPassword(input: ResetPasswordInput) {
    return requestJson<SuccessResponse<ResetPasswordResponse>, ResetPasswordInput>({
      method: 'POST',
      path: `${AUTH_BASE_PATH}/reset-password`,
      body: input,
    })
  },

  verifyEmail(input: VerifyEmailInput) {
    return requestJson<SuccessResponse<VerifyEmailResponse>, VerifyEmailInput>({
      method: 'POST',
      path: `${AUTH_BASE_PATH}/verify-email`,
      body: input,
    })
  },

  resendVerificationEmail(input: EmptyPayload = {}) {
    return requestJson<SuccessResponse<ResendVerificationEmailResponse>, EmptyPayload>({
      method: 'POST',
      path: `${AUTH_BASE_PATH}/resend-verification-email`,
      body: input,
    })
  },

  getOAuthRedirectUrl(provider: OAuthProvider, query?: OAuthRedirectQueryInput) {
    return createApiPath(`${OAUTH_BASE_PATH}/${provider}/redirect`, query)
  },

  getOAuthCallbackUrl(provider: OAuthProvider, query?: OAuthCallbackQueryInput) {
    return createApiPath(`${OAUTH_BASE_PATH}/${provider}/callback`, query)
  },

  redirectToOAuthProvider(provider: OAuthProvider, query?: OAuthRedirectQueryInput) {
    window.location.assign(createApiPath(`${OAUTH_BASE_PATH}/${provider}/redirect`, query))
  },
}
