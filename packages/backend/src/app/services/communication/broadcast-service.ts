import logger from '#logger'
import responseValidationConfig from '#config/response-validation.js'
import { broadcastToChannel } from '#vendor/start/server.js'
import { makeBroadcastJson } from '#vendor/utils/helpers/json-handlers.js'
import {
    createResponseCheck,
    type ResponseCheck,
    type ResponseCheckOptions,
} from '#vendor/utils/validation/validate-response.js'
import { wsConnectionRegistry } from '#app/websocket/ws-connection-registry.js'
import {
    BROADCAST_EVENT_NAMES,
    BroadcastEventSchemas,
    type BroadcastEventName,
    type BroadcastPayload,
} from 'shared/schemas'
import type { WsChannel } from 'shared/guards'

// Every event is checked against its schema in shared/schemas/ws/broadcast-events.ts once,
// before serialization and before the loop over connections
// (docs/plan/ws-async-message-validation-plan.md §4.3). The mode is the response one:
// undeclared keys are stripped in log and drop the event in strict; a mismatch drops it
// in both. There is nobody to answer 500 to, so a dropped event is only logged.
export interface BroadcastService {
    broadcastMessageToUser<E extends BroadcastEventName>(
        userId: string,
        event: E,
        payload: BroadcastPayload<E>,
    ): number
    broadcastMessageToUserExcept<E extends BroadcastEventName>(
        userId: string,
        excludeUuid: string,
        event: E,
        payload: BroadcastPayload<E>,
    ): number
    broadcastMessageToUserConnection<E extends BroadcastEventName>(
        userId: string,
        targetUuid: string,
        event: E,
        payload: BroadcastPayload<E>,
    ): number
    broadcastMessageToChannel<E extends BroadcastEventName>(
        channel: WsChannel,
        event: E,
        payload: BroadcastPayload<E>,
    ): boolean
}

export const createBroadcastService = (options: ResponseCheckOptions): BroadcastService => {
    const checks = new Map<BroadcastEventName, ResponseCheck>()
    for (const event of BROADCAST_EVENT_NAMES) {
        const check = createResponseCheck(BroadcastEventSchemas[event], options)
        if (check !== null) checks.set(event, check)
    }

    // The JSON to send, or null when the event broke its contract (already logged).
    const serialize = (event: BroadcastEventName, payload: unknown): string | null => {
        const check = checks.get(event)
        const result = check?.(payload, { route: event, transport: 'broadcast' })
        if (result?.ok !== true) {
            logger.error({ event }, 'Broadcast event dropped: payload breaks its schema')
            return null
        }
        return makeBroadcastJson(event, 200, result.payload)
    }

    return {
        broadcastMessageToUser<E extends BroadcastEventName>(
            userId: string,
            event: E,
            payload: BroadcastPayload<E>,
        ): number {
            logger.info(`broadcastMessageToUser: ${userId} ${event}`)
            const message = serialize(event, payload)
            if (message === null) return 0
            let counter = 0
            wsConnectionRegistry.forEachConnection(userId, (userConnection) => {
                try {
                    const result = userConnection.send(message)
                    if (result === 1) counter++
                } catch (error) {
                    logger.warn({ err: error }, `Error sending message to user ${userId}`)
                }
            })
            return counter
        },

        broadcastMessageToUserExcept<E extends BroadcastEventName>(
            userId: string,
            excludeUuid: string,
            event: E,
            payload: BroadcastPayload<E>,
        ): number {
            logger.info(`broadcastMessageToUserExcept: ${userId} ${event} exclude: ${excludeUuid}`)
            const message = serialize(event, payload)
            if (message === null) return 0
            let counter = 0
            wsConnectionRegistry.forEachConnection(userId, (userConnection, uuid) => {
                if (uuid === excludeUuid) return
                try {
                    const result = userConnection.send(message)
                    if (result === 1) counter++
                } catch (error) {
                    logger.warn({ err: error }, `Error sending message to user ${userId}`)
                }
            })
            return counter
        },

        broadcastMessageToUserConnection<E extends BroadcastEventName>(
            userId: string,
            targetUuid: string,
            event: E,
            payload: BroadcastPayload<E>,
        ): number {
            logger.info(
                `broadcastMessageToUserConnection: ${userId} ${event} target: ${targetUuid}`,
            )
            const connection = wsConnectionRegistry.getConnection(userId, targetUuid)
            if (connection === undefined) {
                logger.warn(`Target WS connection not found for user ${userId}: ${targetUuid}`)
                return 0
            }
            const message = serialize(event, payload)
            if (message === null) return 0
            try {
                const result = connection.send(message)
                return result === 1 ? 1 : 0
            } catch (error) {
                logger.warn(
                    { err: error },
                    `Error sending message to target connection ${targetUuid}`,
                )
                return 0
            }
        },

        broadcastMessageToChannel<E extends BroadcastEventName>(
            channel: WsChannel,
            event: E,
            payload: BroadcastPayload<E>,
        ): boolean {
            logger.info({ channel, event }, 'broadcastMessageToChannel')
            const message = serialize(event, payload)
            if (message === null) return false
            return broadcastToChannel(channel, event, message)
        },
    }
}

export const broadcastService = createBroadcastService(responseValidationConfig)
