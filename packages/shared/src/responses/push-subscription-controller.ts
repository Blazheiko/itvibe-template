import { type } from '@arktype/type'
import { CanonicalErrorResponseSchema } from './error-response.js'

export const PushSubscriptionSchema = type({
    id: 'string',
    userId: 'string',
    endpoint: 'string',
    p256dhKey: 'string',
    authKey: 'string',
    userAgent: 'string | null',
    ipAddress: 'string | null',
    deviceType: 'string | null',
    browserName: 'string | null',
    browserVersion: 'string | null',
    osName: 'string | null',
    osVersion: 'string | null',
    notificationTypes: "('mention' | 'system')[] | null",
    timezone: 'string | null',
    isActive: 'boolean',
    lastUsedAt: 'Date | null',
    createdAt: 'Date',
    updatedAt: 'Date',
    'notificationLogs?': 'unknown[]',
})
export type PushSubscription = typeof PushSubscriptionSchema.infer

export const PushSubscriptionLogSchema = type({
    id: 'string',
    'subscriptionId?': 'string | null',
    'userId?': 'string | null',
    status: 'string | null',
    'errorMessage?': 'string | null',
    'messageTitle?': 'string | null',
    'messageBody?': 'string | null',
    'messageData?': 'unknown',
    'responseData?': 'unknown',
    sentAt: 'Date',
})
export type PushSubscriptionLog = typeof PushSubscriptionLogSchema.infer

export const PushSubscriptionLogSummarySchema = type({
    id: 'string',
    messageTitle: 'string | null',
    status: 'string | null',
    sentAt: 'Date',
})
export type PushSubscriptionLogSummary = typeof PushSubscriptionLogSummarySchema.infer

// Wire shapes of push-subscription-transformer.ts and the log repository rows:
// the response schemas are an allow-list (feat-046), so every field the client gets
// is listed here.
const NotificationTypesSchema = type("('mention' | 'system')[] | null")

export const SerializedPushSubscriptionSchema = type({
    id: 'string',
    userId: 'string',
    endpoint: 'string',
    p256dhKey: 'string',
    authKey: 'string',
    userAgent: 'string | null',
    ipAddress: 'string | null',
    isActive: 'boolean',
    deviceType: 'string | null',
    browserName: 'string | null',
    browserVersion: 'string | null',
    osName: 'string | null',
    osVersion: 'string | null',
    notificationTypes: NotificationTypesSchema,
    timezone: 'string | null',
    created_at: 'string | null',
    updated_at: 'string | null',
    lastUsedAt: 'string | null',
})
export type SerializedPushSubscription = typeof SerializedPushSubscriptionSchema.infer

const PushLogStatusSchema = type("'SENT' | 'FAILED' | 'PENDING' | null")

export const PushLogSummaryRowSchema = type({
    id: 'bigint',
    messageTitle: 'string | null',
    status: PushLogStatusSchema,
    sentAt: 'Date',
})

export const PushLogRowSchema = type({
    id: 'bigint',
    userId: 'bigint | null',
    subscriptionId: 'bigint | null',
    messageTitle: 'string | null',
    messageBody: 'string | null',
    // `data` of the notification this user's device already received; no fixed shape
    // (an allow-list exception, plan §4.5).
    messageData: 'unknown',
    sentAt: 'Date',
    status: PushLogStatusSchema,
    errorMessage: 'string | null',
    // Written by push-notification-sender-service.ts as { statusCode }.
    responseData: type({ 'statusCode?': 'number | null' }).or('null'),
})

export const GetSubscriptionsResponseSchema = type.or(
    {
        status: "'success'",
        'message?': 'string',
        'subscriptions?': SerializedPushSubscriptionSchema.and({
            notificationLogs: PushLogSummaryRowSchema.array(),
        }).array(),
    },
    CanonicalErrorResponseSchema,
)
export type GetSubscriptionsResponse = typeof GetSubscriptionsResponseSchema.infer

export const CreateSubscriptionResponseSchema = type.or(
    {
        status: "'success'",
        'message?': 'string',
        'subscription?': SerializedPushSubscriptionSchema,
    },
    CanonicalErrorResponseSchema,
)
export type CreateSubscriptionResponse = typeof CreateSubscriptionResponseSchema.infer

export const GetSubscriptionResponseSchema = type.or(
    {
        status: "'success'",
        'message?': 'string',
        'data?': SerializedPushSubscriptionSchema.and({
            notificationLogs: PushLogRowSchema.array(),
        }),
    },
    CanonicalErrorResponseSchema,
)
export type GetSubscriptionResponse = typeof GetSubscriptionResponseSchema.infer

export const UpdateSubscriptionResponseSchema = type.or(
    {
        status: "'success'",
        'message?': 'string',
        'subscription?': SerializedPushSubscriptionSchema,
    },
    CanonicalErrorResponseSchema,
)
export type UpdateSubscriptionResponse = typeof UpdateSubscriptionResponseSchema.infer

export const DeleteSubscriptionResponseSchema = type.or(
    { status: "'success'", 'message?': 'string' },
    CanonicalErrorResponseSchema,
)
export type DeleteSubscriptionResponse = typeof DeleteSubscriptionResponseSchema.infer

export const GetSubscriptionLogsResponseSchema = type.or(
    { status: "'success'", 'message?': 'string', 'data?': PushLogRowSchema.array() },
    CanonicalErrorResponseSchema,
)
export type GetSubscriptionLogsResponse = typeof GetSubscriptionLogsResponseSchema.infer

export const GetSubscriptionStatisticsResponseSchema = type.or(
    {
        status: "'success'",
        'message?': 'string',
        'data?': {
            subscription: SerializedPushSubscriptionSchema,
            statistics: {
                totalNotifications: 'number',
                sentNotifications: 'number',
                failedNotifications: 'number',
                pendingNotifications: 'number',
                successRate: 'number',
                last7DaysCount: 'number',
                lastUsed: 'Date | null',
                isActive: 'boolean',
                createdAt: 'Date',
            },
        },
    },
    CanonicalErrorResponseSchema,
)
export type GetSubscriptionStatisticsResponse = typeof GetSubscriptionStatisticsResponseSchema.infer

export const DeactivateSubscriptionResponseSchema = type.or(
    { status: "'success'", 'message?': 'string', 'data?': SerializedPushSubscriptionSchema },
    CanonicalErrorResponseSchema,
)
export type DeactivateSubscriptionResponse = typeof DeactivateSubscriptionResponseSchema.infer

export const GetVapidPublicKeyResponseSchema = type.or(
    { status: "'success'", 'message?': 'string', 'vapidPublicKey?': 'string' },
    CanonicalErrorResponseSchema,
)
export type GetVapidPublicKeyResponse = typeof GetVapidPublicKeyResponseSchema.infer

export const TestPushResponseSchema = type.or(
    { status: "'success'", message: 'string', 'sent?': 'number', 'failed?': 'number' },
    CanonicalErrorResponseSchema,
)
export type TestPushResponse = typeof TestPushResponseSchema.infer
