import { buildApiError } from '@/utils/websocket-base'
import type { ApiError, WebsocketMessage } from '@/utils/websocket-base'
import { hasResponseError } from '@/utils/response-normalizer'

export interface ApiResolveItem {
    resolve: (data: WebsocketMessage) => void
    reject: (error?: ApiError) => void
    timeout: number
}

/**
 * Settles the pending request whose event matches the response. An error
 * response (e.g. `service_unavailable` while Redis is down) rejects at once
 * instead of waiting for the client timeout; the connection is left alone.
 */
export const settleApiResponse = (
    pending: Record<string, ApiResolveItem>,
    data: WebsocketMessage,
): void => {
    const cb = pending[data.event]
    if (!cb) return

    window.clearTimeout(cb.timeout)
    delete pending[data.event]

    if (!hasResponseError(data)) {
        cb.resolve(data)
    } else {
        cb.reject(buildApiError(data))
    }
}
