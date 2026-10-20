import { describe, expect, it } from 'vitest'
import { WSAdminUserOnlineUpsertPayloadSchema } from 'shared/schemas'

import { isWSAdminUserOnlineUpsertPayload } from '../ws-payload-guards'

const valid = {
    id: '42',
    name: 'Ada',
    email: 'ada@example.test',
    appType: 'pwa',
    userAgent: 'Mozilla/5.0',
    connectionsCount: 2,
}

const cases: [string, unknown][] = [
    ['valid payload', valid],
    ['web appType', { ...valid, appType: 'web' }],
    ['unknown appType', { ...valid, appType: 'desktop' }],
    ['id 0', { ...valid, id: '0' }],
    ['id with leading zero', { ...valid, id: '042' }],
    ['numeric id', { ...valid, id: 42 }],
    ['non-numeric id', { ...valid, id: 'abc' }],
    ['missing email', { ...valid, email: undefined }],
    ['connectionsCount as string', { ...valid, connectionsCount: '2' }],
    ['extra key', { ...valid, isAdmin: true }],
    ['array', [valid]],
    ['null', null],
    ['string', 'payload'],
]

describe('isWSAdminUserOnlineUpsertPayload', () => {
    it.each(cases)('agrees with the ArkType schema: %s', (_label, payload) => {
        expect(isWSAdminUserOnlineUpsertPayload(payload)).toBe(
            WSAdminUserOnlineUpsertPayloadSchema.allows(payload),
        )
    })

    it('accepts the valid payload', () => {
        expect(isWSAdminUserOnlineUpsertPayload(valid)).toBe(true)
    })
})
