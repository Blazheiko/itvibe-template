import mitt from 'mitt'
import type { EventType } from 'mitt'

export interface Events extends Record<EventType, unknown> {
    toggle_notifications: { enabled: boolean }
    init_app: void
    unauthorized: void
    destroy_websocket_base: void
    support_chat_token: {
        token: string
    }
    support_chat_complete: {
        content: string
        screenshots: string[]
    }
    support_chat_error: {
        message: string
    }
    admin_user_online_upsert: {
        id: string
        name: string
        email: string
        appType: 'web' | 'pwa'
        userAgent: string
        connectionsCount: number
    }
    admin_user_online_remove: {
        id: string
    }
    update_available: void
}

const emitter = mitt<Events>()

export const useEventBus = () => emitter
