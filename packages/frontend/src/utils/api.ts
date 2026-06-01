import baseApi from './base-api'
import type {
    UploadAvatarResponse,
    DeleteAvatarResponse,
    InitResponse,
    LoginResponse,
    ChangePasswordResponse,
    ForgotPasswordResponse,
    LogoutAllResponse,
    LogoutResponse,
    VerifyEmailResponse,
    ResendVerificationEmailResponse,
    ResetPasswordResponse,
    SaveUserResponse,
    UpdateWsTokenResponse,
    SupportKnowledgeBaseInitJob,
    AdminUserListResponse,
    AdminOnlineUserListResponse,
    AdminOnlineUserDetailResponse,
    AdminOnlineHistoryListResponse,
    RegisterEmailResponse,
    RegisterPhoneStartResponse,
    RegisterPhoneConfirmResponse,
    RegisterPhoneCompleteResponse,
    LinkPhoneStartResponse,
    LinkPhoneConfirmResponse,
    LinkEmailStartResponse,
    ResetPhoneStartResponse,
    ResetPhoneCompleteResponse,
} from 'shared/responses'
import type { ErrorCode } from 'shared/errors'
import type {
    CreateSubscriptionInput,
    ChangePasswordInput,
    ForgotPasswordInput,
    LoginInput,
    ResetPasswordInput,
    SaveUserInput,
    VerifyEmailInput,
    AdminKnowledgeBaseListQueryInput,
    AdminOnlineHistoryListQueryInput,
    AdminUserListQueryInput,
    PushSubscriptionTestQueryInput,
    RegisterEmailInput,
    RegisterPhoneStartInput,
    RegisterPhoneConfirmInput,
    RegisterPhoneCompleteInput,
    LinkPhoneStartInput,
    LinkPhoneConfirmInput,
    LinkEmailStartInput,
    ResetPhoneStartInput,
    ResetPhoneCompleteInput,
} from 'shared/schemas'
import { getResponseMessage, hasResponseError } from './response-normalizer'

interface ApiResponse<T> {
    data: T | null
    error: { message: string; code?: ErrorCode; transportCode: number } | null
}

const isSuccessfulResponse = <T extends Record<string, unknown>>(
    response: ApiResponse<T>,
): response is { data: T; error: null } =>
    response.error === null && response.data !== null && !hasResponseError(response.data)

export const authApi = {
    login: async (body: LoginInput): Promise<ApiResponse<LoginResponse>> => {
        return baseApi.http<LoginResponse>('POST', '/api/auth/login', body)
    },

    registerEmail: async (body: RegisterEmailInput): Promise<ApiResponse<RegisterEmailResponse>> => {
        return baseApi.http<RegisterEmailResponse>('POST', '/api/auth/register/email', body)
    },

    registerPhoneStart: async (
        body: RegisterPhoneStartInput,
    ): Promise<ApiResponse<RegisterPhoneStartResponse>> => {
        return baseApi.http<RegisterPhoneStartResponse>('POST', '/api/auth/register/phone/start', body)
    },

    registerPhoneConfirm: async (
        body: RegisterPhoneConfirmInput,
    ): Promise<ApiResponse<RegisterPhoneConfirmResponse>> => {
        return baseApi.http<RegisterPhoneConfirmResponse>(
            'POST',
            '/api/auth/register/phone/confirm',
            body,
        )
    },

    registerPhoneComplete: async (
        body: RegisterPhoneCompleteInput,
    ): Promise<ApiResponse<RegisterPhoneCompleteResponse>> => {
        return baseApi.http<RegisterPhoneCompleteResponse>(
            'POST',
            '/api/auth/register/phone/complete-profile',
            body,
        )
    },

    register: async (body: RegisterEmailInput): Promise<ApiResponse<RegisterEmailResponse>> => {
        return authApi.registerEmail(body)
    },

    logout: async (): Promise<ApiResponse<LogoutResponse>> => {
        return baseApi.http<LogoutResponse>('POST', '/api/auth/logout')
    },

    logoutAll: async (): Promise<ApiResponse<LogoutAllResponse>> => {
        return baseApi.http<LogoutAllResponse>('POST', '/api/auth/logout-all')
    },

    changePassword: async (
        body: ChangePasswordInput,
    ): Promise<ApiResponse<ChangePasswordResponse>> => {
        return baseApi.http<ChangePasswordResponse>('POST', '/api/auth/change-password', body)
    },

    forgotPassword: async (
        body: ForgotPasswordInput,
    ): Promise<ApiResponse<ForgotPasswordResponse>> => {
        return baseApi.http<ForgotPasswordResponse>('POST', '/api/auth/forgot-password', body)
    },

    startPhonePasswordReset: async (
        body: ResetPhoneStartInput,
    ): Promise<ApiResponse<ResetPhoneStartResponse>> => {
        return baseApi.http<ResetPhoneStartResponse>('POST', '/api/auth/reset-phone/start', body)
    },

    completePhonePasswordReset: async (
        body: ResetPhoneCompleteInput,
    ): Promise<ApiResponse<ResetPhoneCompleteResponse>> => {
        return baseApi.http<ResetPhoneCompleteResponse>('POST', '/api/auth/reset-phone/complete', body)
    },

    resetPassword: async (
        body: ResetPasswordInput,
    ): Promise<ApiResponse<ResetPasswordResponse>> => {
        return baseApi.http<ResetPasswordResponse>('POST', '/api/auth/reset-password', body)
    },

    verifyEmail: async (body: VerifyEmailInput): Promise<ApiResponse<VerifyEmailResponse>> => {
        return baseApi.http<VerifyEmailResponse>('POST', '/api/auth/verify-email', body)
    },

    resendVerificationEmail: async (): Promise<ApiResponse<ResendVerificationEmailResponse>> => {
        return baseApi.http<ResendVerificationEmailResponse>(
            'POST',
            '/api/auth/resend-verification-email',
        )
    },

    startPhoneLink: async (
        body: LinkPhoneStartInput,
    ): Promise<ApiResponse<LinkPhoneStartResponse>> => {
        return baseApi.http<LinkPhoneStartResponse>('POST', '/api/auth/link-phone/start', body)
    },

    confirmPhoneLink: async (
        body: LinkPhoneConfirmInput,
    ): Promise<ApiResponse<LinkPhoneConfirmResponse>> => {
        return baseApi.http<LinkPhoneConfirmResponse>('POST', '/api/auth/link-phone/confirm', body)
    },

    startEmailLink: async (
        body: LinkEmailStartInput,
    ): Promise<ApiResponse<LinkEmailStartResponse>> => {
        return baseApi.http<LinkEmailStartResponse>('POST', '/api/auth/link-email/start', body)
    },
}

export const mainApi = {
    init: async (): Promise<ApiResponse<InitResponse>> => {
        return baseApi.http<InitResponse>('GET', '/api/main/init')
    },

    updateWsToken: async (): Promise<ApiResponse<UpdateWsTokenResponse>> => {
        return baseApi.http<UpdateWsTokenResponse>('GET', '/api/main/update-ws-token')
    },

    saveUser: async (body: SaveUserInput): Promise<ApiResponse<SaveUserResponse>> => {
        return baseApi.http<SaveUserResponse>('POST', '/api/main/save-user', body)
    },
}

interface PushSubscriptionData extends Record<string, unknown> {
    endpoint: string
    p256dhKey: string
    authKey: string
    userAgent?: string
    ipAddress?: string
    deviceType?: string
    browserName?: string
    browserVersion?: string
    osName?: string
    osVersion?: string
    notificationTypes?: ('mention' | 'system')[]
    timezone?: string
}

interface PushSubscriptionResponse {
    id: string
    userId: string
    endpoint: string
    p256dhKey: string
    authKey: string
    userAgent?: string
    deviceType?: string
    browserName?: string
    isActive: boolean
    created_at: string
    updated_at: string
}

interface PushSubscriptionStatistics {
    total_sent: number
    total_delivered: number
    last_sent_at?: string
    subscription_duration: number
}

export const pushSubscriptionApi = {
    getSubscriptions: async (): Promise<ApiResponse<PushSubscriptionResponse[]>> => {
        return baseApi.http<PushSubscriptionResponse[]>('GET', '/api/push-subscriptions')
    },

    createSubscription: async (
        subscriptionData: CreateSubscriptionInput | PushSubscriptionData,
    ): Promise<ApiResponse<PushSubscriptionResponse>> => {
        return baseApi.http<PushSubscriptionResponse>(
            'POST',
            '/api/push-subscriptions',
            subscriptionData,
        )
    },

    getSubscription: async (
        subscriptionId: string,
    ): Promise<ApiResponse<PushSubscriptionResponse>> => {
        return baseApi.http<PushSubscriptionResponse>(
            'GET',
            `/api/push-subscriptions/${subscriptionId}`,
        )
    },

    deleteSubscription: async (
        subscriptionId: string,
    ): Promise<ApiResponse<{ success: boolean }>> => {
        return baseApi.http<{ success: boolean }>(
            'DELETE',
            `/api/push-subscriptions/${subscriptionId}`,
        )
    },

    getSubscriptionStatistics: async (
        subscriptionId: string,
    ): Promise<ApiResponse<PushSubscriptionStatistics>> => {
        return baseApi.http<PushSubscriptionStatistics>(
            'GET',
            `/api/push-subscriptions/${subscriptionId}/statistics`,
        )
    },

    deactivateSubscription: async (
        subscriptionId: string,
    ): Promise<ApiResponse<PushSubscriptionResponse>> => {
        return baseApi.http<PushSubscriptionResponse>(
            'PUT',
            `/api/push-subscriptions/${subscriptionId}/deactivate`,
            {},
        )
    },

    getVapidPublicKey: async (): Promise<ApiResponse<{ vapidPublicKey: string }>> => {
        return baseApi.http<{ vapidPublicKey: string }>(
            'GET',
            '/api/push-subscriptions/vapid-public-key',
        )
    },

    testPush: async (
        title?: PushSubscriptionTestQueryInput['title'],
        body?: PushSubscriptionTestQueryInput['body'],
    ): Promise<ApiResponse<{ status: string; message: string; sent?: number; failed?: number }>> => {
        const params = new URLSearchParams()
        if (title) params.set('title', title)
        if (body) params.set('body', body)
        const query = params.toString()
        return baseApi.http<{ status: string; message: string; sent?: number; failed?: number }>(
            'GET',
            `/api/push-subscriptions/test-push${query ? `?${query}` : ''}`,
        )
    },
}

export const avatarApi = {
    upload: async (file: Blob): Promise<ApiResponse<UploadAvatarResponse>> => {
        const formData = new FormData()
        formData.append('avatar', file, 'avatar.webp')
        return baseApi.upload<UploadAvatarResponse>('POST', '/api/avatar/upload', formData)
    },

    delete: async (): Promise<ApiResponse<DeleteAvatarResponse>> => {
        return baseApi.http<DeleteAvatarResponse>('DELETE', '/api/avatar')
    },
}

export interface SupportChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    screenshots: string[] | null
    createdAt: string
}

export interface KnowledgeBaseArticle {
    id: string
    title: string
    content: string
    category: string | null
    isActive: boolean
    hasScreenshot: boolean
    screenshotKey: string | null
    embeddingIndexed: boolean
    createdAt: string
    updatedAt: string
}

export type KnowledgeBaseInitStatus = SupportKnowledgeBaseInitJob

export const supportApi = {
    getChatHistory: async (options: { signal?: AbortSignal } = {}): Promise<SupportChatMessage[]> => {
        const response = await baseApi.http<{ status: string; data?: SupportChatMessage[] }>(
            'GET',
            '/api/support/chat/history',
            {},
            options,
        )
        if (!isSuccessfulResponse(response)) return []
        return response.data.data ?? []
    },

    deleteChatHistory: async (): Promise<boolean> => {
        const response = await baseApi.http<{ status: string }>(
            'DELETE',
            '/api/support/chat/history',
        )
        return isSuccessfulResponse(response)
    },

    getScreenshotUrl: (articleId: string): string => {
        return `/api/support/screenshot/${encodeURIComponent(articleId)}`
    },
}

export const adminKnowledgeBaseApi = {
    getAll: async (
        params?: AdminKnowledgeBaseListQueryInput,
    ): Promise<{ items: KnowledgeBaseArticle[]; total: number }> => {
        const query = new URLSearchParams()
        if (params?.category) query.set('category', params.category)
        if (params?.page !== undefined) query.set('page', String(params.page))
        if (params?.limit !== undefined) query.set('limit', String(params.limit))
        const qs = query.toString()
        const response = await baseApi.http<{
            status: string
            data?: KnowledgeBaseArticle[]
            total?: number
        }>('GET', `/api/admin/knowledge-base${qs ? `?${qs}` : ''}`)
        if (!isSuccessfulResponse(response)) return { items: [], total: 0 }
        return { items: response.data.data ?? [], total: response.data.total ?? 0 }
    },

    create: async (payload: {
        title: string
        content: string
        category?: string
        isActive?: boolean
    }): Promise<KnowledgeBaseArticle | null> => {
        const response = await baseApi.http<{ status: string; data?: KnowledgeBaseArticle }>(
            'POST',
            '/api/admin/knowledge-base',
            payload,
        )
        if (!isSuccessfulResponse(response)) return null
        return response.data.data ?? null
    },

    update: async (
        id: string,
        payload: { title?: string; content?: string; category?: string | null; isActive?: boolean },
    ): Promise<KnowledgeBaseArticle | null> => {
        const response = await baseApi.http<{ status: string; data?: KnowledgeBaseArticle }>(
            'PUT',
            `/api/admin/knowledge-base/${encodeURIComponent(id)}`,
            payload,
        )
        if (!isSuccessfulResponse(response)) return null
        return response.data.data ?? null
    },

    delete: async (id: string): Promise<boolean> => {
        const response = await baseApi.http<{ status: string }>(
            'DELETE',
            `/api/admin/knowledge-base/${encodeURIComponent(id)}`,
        )
        return isSuccessfulResponse(response)
    },

    uploadScreenshot: async (id: string, file: File): Promise<KnowledgeBaseArticle | null> => {
        const formData = new FormData()
        formData.append('screenshot', file)
        const response = await baseApi.upload<{ status: string; data?: KnowledgeBaseArticle }>(
            'POST',
            `/api/admin/knowledge-base/${encodeURIComponent(id)}/screenshot`,
            formData,
        )
        if (!isSuccessfulResponse(response)) return null
        return response.data.data ?? null
    },

    deleteScreenshot: async (id: string): Promise<KnowledgeBaseArticle | null> => {
        const response = await baseApi.http<{ status: string; data?: KnowledgeBaseArticle }>(
            'DELETE',
            `/api/admin/knowledge-base/${encodeURIComponent(id)}/screenshot`,
        )
        if (!isSuccessfulResponse(response)) return null
        return response.data.data ?? null
    },

    reindex: async (id: string): Promise<boolean> => {
        const response = await baseApi.http<{ status: string }>(
            'POST',
            `/api/admin/knowledge-base/${encodeURIComponent(id)}/reindex`,
        )
        return isSuccessfulResponse(response)
    },

    reindexAll: async (): Promise<number> => {
        const response = await baseApi.http<{ status: string; indexed?: number }>(
            'POST',
            '/api/admin/knowledge-base/reindex-all',
        )
        if (!isSuccessfulResponse(response)) return 0
        return response.data.indexed ?? 0
    },

    startInit: async (): Promise<{
        ok: boolean
        status: KnowledgeBaseInitStatus | null
        message: string | null
    }> => {
        const response = await baseApi.http<{
            status: string
            data?: KnowledgeBaseInitStatus
            message?: string
        }>('POST', '/api/admin/knowledge-base/init')
        if (!isSuccessfulResponse(response)) {
            return {
                ok: false,
                status: response.data?.data ?? null,
                message: getResponseMessage(
                    response.data,
                    response.error?.message ?? 'Failed to start initialization',
                ),
            }
        }
        return {
            ok: true,
            status: response.data.data ?? null,
            message: null,
        }
    },

    getInitStatus: async (): Promise<KnowledgeBaseInitStatus | null> => {
        const response = await baseApi.http<{ status: string; data?: KnowledgeBaseInitStatus }>(
            'GET',
            '/api/admin/knowledge-base/init-status',
        )
        if (!isSuccessfulResponse(response)) return null
        return response.data.data ?? null
    },
}

export const adminUsersApi = {
    list: async (params?: AdminUserListQueryInput): Promise<ApiResponse<AdminUserListResponse>> => {
        const query = new URLSearchParams()

        if (params?.limit !== undefined) query.set('limit', String(params.limit))
        if (params?.userId !== undefined && params.userId.trim() !== '') {
            query.set('userId', params.userId.trim())
        }
        if (params?.dateFrom !== undefined && params.dateFrom !== '') query.set('dateFrom', params.dateFrom)
        if (params?.dateTo !== undefined && params.dateTo !== '') query.set('dateTo', params.dateTo)

        const qs = query.toString()
        return baseApi.http<AdminUserListResponse>('GET', `/api/admin/users${qs ? `?${qs}` : ''}`)
    },
}

export const adminOnlineUsersApi = {
    list: async (): Promise<ApiResponse<AdminOnlineUserListResponse>> => {
        return baseApi.http<AdminOnlineUserListResponse>('GET', '/api/admin/users-online')
    },

    getById: async (id: string): Promise<ApiResponse<AdminOnlineUserDetailResponse>> => {
        return baseApi.http<AdminOnlineUserDetailResponse>('GET', `/api/admin/users-online/${id}`)
    },
}

export const adminOnlineHistoryApi = {
    list: async (
        params?: AdminOnlineHistoryListQueryInput,
    ): Promise<ApiResponse<AdminOnlineHistoryListResponse>> => {
        const query = new URLSearchParams()

        if (params?.limit !== undefined) query.set('limit', String(params.limit))
        if (params?.cursor !== undefined && params.cursor !== '') query.set('cursor', params.cursor)
        if (params?.userId !== undefined && params.userId.trim() !== '') {
            query.set('userId', params.userId.trim())
        }
        if (params?.dateFrom !== undefined && params.dateFrom !== '') query.set('dateFrom', params.dateFrom)
        if (params?.dateTo !== undefined && params.dateTo !== '') query.set('dateTo', params.dateTo)

        const qs = query.toString()
        return baseApi.http<AdminOnlineHistoryListResponse>(
            'GET',
            `/api/admin/history-online${qs ? `?${qs}` : ''}`,
        )
    },
}
