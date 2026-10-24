import { describe, expect, it, vi } from 'vitest'

import { settleApiResponse, type ApiResolveItem } from '../ws-api-response'
import type { WebsocketMessage } from '../websocket-base'

const pendingFor = (event: string) => {
    const item: ApiResolveItem = {
        resolve: vi.fn(),
        reject: vi.fn(),
        timeout: window.setTimeout(() => {}, 10_000),
    }
    return { item, pending: { [event]: item } as Record<string, ApiResolveItem> }
}

describe('settleApiResponse', () => {
    it('rejects the matching request at once on service_unavailable', () => {
        const { item, pending } = pendingFor('api/user/me')
        const response = {
            event: 'api/user/me',
            status: 'error',
            data: null,
            timestamp: Date.now(),
            error: {
                code: 'service_unavailable',
                message: 'Service temporarily unavailable. Try again later.',
            },
        } as unknown as WebsocketMessage

        settleApiResponse(pending, response)

        expect(item.resolve).not.toHaveBeenCalled()
        expect(item.reject).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'service_unavailable' }),
        )
        expect(pending).toEqual({})
    })

    it('resolves a successful response', () => {
        const { item, pending } = pendingFor('api/user/me')
        const response = {
            event: 'api/user/me',
            status: 'success',
            data: {},
            timestamp: Date.now(),
        } as unknown as WebsocketMessage

        settleApiResponse(pending, response)

        expect(item.resolve).toHaveBeenCalledWith(response)
        expect(item.reject).not.toHaveBeenCalled()
    })

    it('ignores responses without a pending request', () => {
        const { item, pending } = pendingFor('api/a')
        settleApiResponse(pending, {
            event: 'api/b',
            status: 'error',
        } as unknown as WebsocketMessage)
        expect(item.reject).not.toHaveBeenCalled()
        expect(Object.keys(pending)).toEqual(['api/a'])
    })
})
