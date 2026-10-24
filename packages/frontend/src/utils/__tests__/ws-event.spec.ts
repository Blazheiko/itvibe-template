import { describe, expect, it } from 'vitest'

import { buildWsEvent, normalizeApiPrefix } from '../ws-event'

describe('WS event names (code-issues item 17)', () => {
    it.each([
        [undefined, 'api'],
        ['', 'api'],
        ['api', 'api'],
        ['v1', 'v1'],
        ['/v1/', 'v1'],
        ['  /internal/api ', 'internal/api'],
    ])('normalizes the prefix %j to %j', (raw, expected) => {
        expect(normalizeApiPrefix(raw)).toBe(expected)
    })

    it('builds <prefix>/<route> like the server route keys', () => {
        expect(buildWsEvent('support/support_open_chat', 'api')).toBe(
            'api/support/support_open_chat',
        )
        expect(buildWsEvent('admin/subscribe_online_users', 'v1')).toBe(
            'v1/admin/subscribe_online_users',
        )
        expect(buildWsEvent('/user/me', 'v1')).toBe('v1/user/me')
    })
})
