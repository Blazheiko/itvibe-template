import { DateTime } from 'luxon'
import type { PushSubscriptionRow, PushSubscriptionWithLogs } from '#app/repositories/index.js'
import {
    pushNotificationLogTransformer,
    type SerializedPushLogSummary,
} from './push-notification-log-transformer.js'

export type SerializedPushSubscription = Omit<
    PushSubscriptionRow,
    'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastUsedAt'
> & {
    id: string
    userId: string
    created_at: string | null
    updated_at: string | null
    lastUsedAt: string | null
}

export type SerializedPushSubscriptionWithLogs = Omit<
    PushSubscriptionWithLogs,
    'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastUsedAt' | 'notificationLogs'
> & {
    notificationLogs: SerializedPushLogSummary[]
    id: string
    userId: string
    created_at: string | null
    updated_at: string | null
    lastUsedAt: string | null
}

export const pushSubscriptionTransformer = {
    serialize(subscription: PushSubscriptionRow): SerializedPushSubscription {
        const { createdAt, updatedAt, lastUsedAt, id, userId, ...rest } = subscription
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            lastUsedAt: lastUsedAt !== null ? DateTime.fromJSDate(lastUsedAt).toISO() : null,
        }
    },

    serializeWithLogs(subscription: PushSubscriptionWithLogs): SerializedPushSubscriptionWithLogs {
        const { createdAt, updatedAt, lastUsedAt, id, userId, notificationLogs, ...rest } =
            subscription
        return {
            ...rest,
            notificationLogs: notificationLogs.map((log) =>
                pushNotificationLogTransformer.serializeSummary(log),
            ),
            id: String(id),
            userId: String(userId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            lastUsedAt: lastUsedAt !== null ? DateTime.fromJSDate(lastUsedAt).toISO() : null,
        }
    },

    serializeArray(subscriptions: PushSubscriptionRow[]): SerializedPushSubscription[] {
        return subscriptions.map((s) => pushSubscriptionTransformer.serialize(s))
    },

    serializeArrayWithLogs(
        subscriptions: PushSubscriptionWithLogs[],
    ): SerializedPushSubscriptionWithLogs[] {
        return subscriptions.map((s) => pushSubscriptionTransformer.serializeWithLogs(s))
    },
}
