import { describe, expect, it } from 'vitest'

import { apiUrl, normalizeApiPrefix, toWsUrl } from '../api-path'

describe('playground API paths', () => {
    it.each([
        [undefined, 'api'],
        ['', 'api'],
        ['/v1/', 'v1'],
        [' internal/api ', 'internal/api'],
    ])('normalizes the prefix %j to %j (item 62)', (raw, expected) => {
        expect(normalizeApiPrefix(raw)).toBe(expected)
    })

    it('builds URLs under the prefix, same-origin when baseUrl is empty', () => {
        expect(apiUrl('', 'doc/routes', 'api')).toBe('/api/doc/routes')
        expect(apiUrl('http://127.0.0.1:3000/', '/doc/routes', 'v1')).toBe(
            'http://127.0.0.1:3000/v1/doc/routes',
        )
        expect(apiUrl('https://api.example.test', 'ping', 'api')).toBe(
            'https://api.example.test/api/ping',
        )
    })

    it.each([
        ['http://localhost:3000', 'ws://localhost:3000'],
        ['https://api.example.test', 'wss://api.example.test'],
        ['HTTPS://API.EXAMPLE.TEST', 'wss://API.EXAMPLE.TEST'],
        ['ws://already', 'ws://already'],
    ])('maps %s to %s (item 63)', (input, expected) => {
        expect(toWsUrl(input)).toBe(expected)
    })
})
