import type { PushNotificationLogRow, PushSubscriptionLogSummary } from '#app/repositories/index.js'

// Wire shape of push_notifications_log rows (feat-047): ids as strings, sentAt as an ISO
// string, as makeJson / JSON.stringify would send them anyway.
export type SerializedPushNotificationLog = Omit<
    PushNotificationLogRow,
    'id' | 'userId' | 'subscriptionId' | 'sentAt'
> & {
    id: string
    userId: string | null
    subscriptionId: string | null
    sentAt: string
}

export type SerializedPushLogSummary = Omit<PushSubscriptionLogSummary, 'id' | 'sentAt'> & {
    id: string
    sentAt: string
}

export const pushNotificationLogTransformer = {
    serialize(log: PushNotificationLogRow): SerializedPushNotificationLog {
        const { id, userId, subscriptionId, sentAt, ...rest } = log
        return {
            ...rest,
            id: String(id),
            userId: userId === null ? null : String(userId),
            subscriptionId: subscriptionId === null ? null : String(subscriptionId),
            sentAt: sentAt.toISOString(),
        }
    },

    serializeArray(logs: PushNotificationLogRow[]): SerializedPushNotificationLog[] {
        return logs.map((log) => pushNotificationLogTransformer.serialize(log))
    },

    serializeSummary(log: PushSubscriptionLogSummary): SerializedPushLogSummary {
        const { id, sentAt, ...rest } = log
        return { ...rest, id: String(id), sentAt: sentAt.toISOString() }
    },
}
