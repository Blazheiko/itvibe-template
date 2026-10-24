import { describe, expect, it, vi } from 'vitest'
import type { HttpData } from '#vendor/types/types.js'

vi.mock('#app/repositories/index.js', () => ({ userRepository: {} }))
vi.mock('#app/transformers/index.js', () => ({ userTransformer: {} }))
vi.mock('#app/services/auth/generate-ws-token-service.js', () => ({
    generateWsToken: vi.fn(),
}))
vi.mock('#app/services/communication/get-ws-url-service.js', () => ({
    getWsUrl: vi.fn(),
}))

describe('mainService.testHeaders', () => {
    it('never echoes cookie or authorization headers back to the client', async () => {
        const { mainService } = await import('./main-service.js')
        const httpData = {
            params: { id: '1' },
            headers: new Map([
                ['accept', 'application/json'],
                ['authorization', 'Bearer secret-token'],
                ['cookie', 'session=secret'],
            ]),
        } as unknown as HttpData

        const result = mainService.testHeaders(httpData)

        expect(result.headers).toEqual([{ key: 'accept', value: 'application/json' }])
        expect(result.params).toEqual([['id', '1']])
    })
})
