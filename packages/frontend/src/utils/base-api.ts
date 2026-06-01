// WebsocketBase больше не используется - заменен на useWebSocketConnection
import { useEventBus } from './event-bus'
import { useWebSocketConnection } from '@/composables/useWebSocketConnection'
import {
    hasResponseError,
    isUnauthorizedError,
    normalizeResponseError,
} from './response-normalizer'
import type { ErrorCode } from 'shared/errors'
import { getCsrfToken, updateCsrfTokenFromResponse } from './csrf-token'

type HttpResponse = Record<string, unknown>

interface ApiResponse<T> {
    data: T | null
    error: { message: string; code?: ErrorCode; transportCode: number } | null
}

interface ApiMethods {
    http: <T = HttpResponse>(
        method: string,
        route: string,
        body?: Record<string, unknown>,
        options?: { signal?: AbortSignal },
    ) => Promise<ApiResponse<T>>
    upload: <T = HttpResponse>(
        method: string,
        route: string,
        formData: FormData,
        options?: { signal?: AbortSignal },
    ) => Promise<ApiResponse<T>>
    ws: <T = HttpResponse>(route: string, body?: Record<string, unknown>) => Promise<T | null>
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | string

interface HttpRequestInit {
    method: HttpMethod
    headers: Record<string, string>
    body?: string
    signal?: AbortSignal
    credentials?: RequestCredentials
}

const parseResponseJson = async (response: Response): Promise<unknown> => {
    try {
        return await response.json()
    } catch {
        return null
    }
}

const normalizeUrl = (url: string): string => {
    if (url.endsWith('/')) {
        return url.slice(0, -1)
    }
    return url
}
const BASE_URL = normalizeUrl(import.meta.env.VITE_BASE_URL || 'https://itvibe-template.example')

// Старый WebSocketClient больше не используется - используем useWebSocketConnection
const { websocketApi } = useWebSocketConnection()
const eventBus = useEventBus()
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])
let csrfRecoveryRequested = false

const isUnsafeMethod = (method: HttpMethod): boolean => UNSAFE_METHODS.has(method.toLowerCase())

const appendCsrfHeader = (headers: Record<string, string>, method: HttpMethod): void => {
    if (!isUnsafeMethod(method)) return
    const token = getCsrfToken()
    if (token !== null) {
        headers['X-CSRF-Token'] = token
    }
}

const updateCsrfRecoveryState = (responseData: unknown): void => {
    if (updateCsrfTokenFromResponse(responseData)) {
        csrfRecoveryRequested = false
    }
}

const requestCsrfRecovery = (): void => {
    if (csrfRecoveryRequested) return
    csrfRecoveryRequested = true
    eventBus.emit('init_app')
}

const api: ApiMethods = {
    http: async <T = HttpResponse>(
        method: HttpMethod,
        route: string,
        body: Record<string, unknown> = {},
        options: { signal?: AbortSignal } = {},
    ): Promise<ApiResponse<T>> => {
        // const BASE_URL = baseUrl
        const init: HttpRequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            signal: options.signal,
            credentials: 'include',
        }
        appendCsrfHeader(init.headers, method)

        if (method.toLowerCase() !== 'get' && method.toLowerCase() !== 'delete') {
            init.body = JSON.stringify(body)
        }

        try {
            const response = await fetch(`${BASE_URL}${route}`, init)
            const responseData = await parseResponseJson(response)
            updateCsrfRecoveryState(responseData)
            const fallbackMessage =
                response.status === 422
                    ? 'Validation Error'
                    : response.status === 401
                      ? 'Unauthorized'
                      : `HTTP error! status: ${response.status}`

            if (!response.ok || hasResponseError(responseData)) {
                const normalizedError = normalizeResponseError(
                    responseData,
                    fallbackMessage,
                    response.status,
                )

                if (isUnauthorizedError(responseData, normalizedError.transportCode)) {
                    eventBus.emit('unauthorized')
                }
                if (normalizedError.code === 'csrf_invalid') {
                    requestCsrfRecovery()
                }

                return {
                    data: responseData as T,
                    error: {
                        code: normalizedError.code,
                        transportCode: normalizedError.transportCode,
                        message: normalizedError.message,
                    },
                }
            }

            return { data: responseData as T, error: null }
        } catch (error: unknown) {
            console.error('Network error:', error)
            return {
                data: null,
                error: {
                    transportCode: 0,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Network error. Please try again later.',
                },
            }
        }
    },

    upload: async <T = HttpResponse>(
        method: HttpMethod,
        route: string,
        formData: FormData,
        options: { signal?: AbortSignal } = {},
    ): Promise<ApiResponse<T>> => {
        try {
            const uploadHeaders: Record<string, string> = {}
            appendCsrfHeader(uploadHeaders, method)

            const response = await fetch(`${BASE_URL}${route}`, {
                method,
                headers: uploadHeaders,
                body: formData,
                signal: options.signal,
                credentials: 'include',
            })
            const responseData = await parseResponseJson(response)
            updateCsrfRecoveryState(responseData)
            const fallbackMessage =
                response.status === 422
                    ? 'Validation Error'
                    : response.status === 401
                      ? 'Unauthorized'
                      : `HTTP error! status: ${response.status}`

            if (!response.ok || hasResponseError(responseData)) {
                const normalizedError = normalizeResponseError(
                    responseData,
                    fallbackMessage,
                    response.status,
                )

                if (isUnauthorizedError(responseData, normalizedError.transportCode)) {
                    eventBus.emit('unauthorized')
                }
                if (normalizedError.code === 'csrf_invalid') {
                    requestCsrfRecovery()
                }

                return {
                    data: responseData as T,
                    error: {
                        code: normalizedError.code,
                        transportCode: normalizedError.transportCode,
                        message: normalizedError.message,
                    },
                }
            }

            return { data: responseData as T, error: null }
        } catch (error: unknown) {
            console.error('Upload error:', error)
            return {
                data: null,
                error: {
                    transportCode: 0,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Upload failed. Please try again later.',
                },
            }
        }
    },

    ws: async <T = HttpResponse>(
        route: string,
        body: Record<string, unknown> = {},
    ): Promise<T | null> => {
        if (!websocketApi) return null

        try {
            // console.log('websocketApi ws route', route)
            // console.log('websocketApi ws body', body)
            const result = await websocketApi(route, body)
            console.log({ result })
            return result as unknown as T
        } catch (e) {
            console.error(e)
            return null
        }
    },
}

export default api
