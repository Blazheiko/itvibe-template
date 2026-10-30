import { describe, expect, it } from 'vitest'

import { pushNotificationLogTransformer } from './push-notification-log-transformer.js'

const row = {
    id: 11n,
    userId: 7n,
    subscriptionId: 3n,
    messageTitle: 'Hi',
    messageBody: 'Body',
    messageData: { url: '/' },
    sentAt: new Date('2026-10-25T10:00:00.000Z'),
    status: 'SENT' as const,
    errorMessage: null,
    responseData: { statusCode: 201 },
}

describe('pushNotificationLogTransformer', () => {
    it('sends ids as strings and sentAt as an ISO string', () => {
        expect(pushNotificationLogTransformer.serialize(row)).toEqual({
            ...row,
            id: '11',
            userId: '7',
            subscriptionId: '3',
            sentAt: '2026-10-25T10:00:00.000Z',
        })
    })

    it('keeps null user and subscription ids', () => {
        const serialized = pushNotificationLogTransformer.serialize({
            ...row,
            userId: null,
            subscriptionId: null,
        })
        expect(serialized).toMatchObject({ userId: null, subscriptionId: null })
    })

    it('serializes a log summary', () => {
        expect(
            pushNotificationLogTransformer.serializeSummary({
                id: 11n,
                messageTitle: null,
                status: null,
                sentAt: new Date('2026-10-25T10:00:00.000Z'),
            }),
        ).toEqual({
            id: '11',
            messageTitle: null,
            status: null,
            sentAt: '2026-10-25T10:00:00.000Z',
        })
    })
})
