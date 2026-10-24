// Shapes of WebSocket messages and the client-side API error built from them.
import { normalizeResponseError } from './response-normalizer'
import type { ErrorCode } from 'shared/errors'

export type WebsocketPayload = Record<string, unknown>
export type WebsocketErrorMessages = Record<string, unknown> | string[] | string

interface WebsocketErrorPayload {
    code?: number | ErrorCode
    message?: string
    messages?: WebsocketErrorMessages
}

export interface WebsocketMessage {
    event: string
    status: number | string
    timestamp: number
    payload: WebsocketPayload
    code?: number | string | ErrorCode
    error?: WebsocketErrorPayload | null
}

export interface ApiError {
    code?: ErrorCode
    transportCode?: number
    status?: number | string
    message?: string
    messages?: WebsocketErrorMessages
}

export const buildApiError = (data: WebsocketMessage): ApiError => {
    const normalizedError = normalizeResponseError(data, 'WebSocket request failed')
    return {
        code: normalizedError.code,
        transportCode: normalizedError.transportCode,
        status: normalizedError.status,
        message: normalizedError.message,
        messages: normalizedError.messages,
    }
}
