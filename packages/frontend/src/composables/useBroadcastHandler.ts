import { useEventBus } from '@/utils/event-bus'
import { reportValidationFailure } from '@/utils/sentry-payload-summary'
import { WSAdminUserOnlineUpsertPayloadSchema } from 'shared/schemas'
import type { WebsocketMessage } from '@/utils/websocket-base'

export const useBroadcastHandler = () => {
    const eventBus = useEventBus()

    const isObject = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null

    const handlers: Record<string, (event: WebsocketMessage) => void> = {
        support_chat_token: (event) => {
            if (!isObject(event.payload) || typeof event.payload.token !== 'string') {
                reportValidationFailure('support_chat_token', 'payload_shape', event.payload)
                return
            }
            eventBus.emit('support_chat_token', { token: event.payload.token })
        },
        support_chat_complete: (event) => {
            if (!isObject(event.payload) || typeof event.payload.content !== 'string') {
                reportValidationFailure('support_chat_complete', 'payload_shape', event.payload)
                return
            }
            eventBus.emit('support_chat_complete', {
                content: event.payload.content,
                screenshots: Array.isArray(event.payload.screenshots)
                    ? event.payload.screenshots.filter((item): item is string => typeof item === 'string')
                    : [],
            })
        },
        support_chat_error: (event) => {
            if (!isObject(event.payload) || typeof event.payload.message !== 'string') {
                reportValidationFailure('support_chat_error', 'payload_shape', event.payload)
                return
            }
            eventBus.emit('support_chat_error', { message: event.payload.message })
        },
        admin_user_online_upsert: (event) => {
            try {
                const payload = WSAdminUserOnlineUpsertPayloadSchema.assert(event.payload)
                eventBus.emit('admin_user_online_upsert', {
                    id: payload.id,
                    name: payload.name,
                    email: payload.email,
                    appType: payload.appType,
                    userAgent: payload.userAgent,
                    connectionsCount: payload.connectionsCount,
                })
            } catch {
                reportValidationFailure('admin_user_online_upsert', 'schema_assert', event.payload)
            }
        },
        admin_user_online_remove: (event) => {
            if (!isObject(event.payload) || typeof event.payload.id !== 'string') {
                reportValidationFailure('admin_user_online_remove', 'payload_shape', event.payload)
                return
            }
            eventBus.emit('admin_user_online_remove', { id: event.payload.id })
        },
    }

    const handleBroadcast = (event: WebsocketMessage): void => {
        const handler = handlers[event.event.replace(/^broadcast:/, '')]
        if (handler) {
            handler(event)
        }
    }

    return { handleBroadcast }
}
