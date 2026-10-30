import type { RateLimit, RouteItem, MyWebSocket, WsResponseData } from '#vendor/types/types.js'
import logger from '#vendor/utils/logger.js'
import { clientKey, rateLimitStore, retryAfterSeconds } from './rate-limit-store.js'
import { createWsErrorEnvelope } from '#vendor/utils/network/ws-error-envelope.js'

function getWsClientIdentifier(ws: MyWebSocket): string {
    // Use IP address from WebSocket user data for rate limiting
    const { ip } = ws.getUserData()
    return clientKey(typeof ip === 'string' ? ip : null)
}

function determineWsRateLimit(route: RouteItem, groupRateLimit?: RateLimit): RateLimit | null {
    // Route limits override group limits
    if (route.rateLimit !== undefined) {
        return route.rateLimit
    }

    if (groupRateLimit !== undefined) {
        return groupRateLimit
    }

    return null
}

interface WsRateLimitResult {
    allowed: boolean
    retryAfter?: number
    errorMessage?: string
}

export default function checkRateLimitWs(
    ws: MyWebSocket,
    route: RouteItem,
    groupRateLimit?: RateLimit,
): WsRateLimitResult {
    try {
        const rateLimit = determineWsRateLimit(route, groupRateLimit)

        if (rateLimit === null) {
            return { allowed: true }
        }

        const key = `ws-msg:${getWsClientIdentifier(ws)}:${route.url}`
        const decision = rateLimitStore.consume(key, {
            windowMs: rateLimit.windowMs,
            max: rateLimit.maxRequests,
        })

        if (!decision.allowed) {
            logger.warn(
                { key, limit: decision.limit, retryAfterMs: decision.retryAfterMs },
                'WebSocket rate limit exceeded',
            )
            return {
                allowed: false,
                retryAfter: retryAfterSeconds(decision.retryAfterMs),
                errorMessage: `Rate limit exceeded for ${route.url}`,
            }
        }

        return { allowed: true }
    } catch (error) {
        logger.error({ err: error }, 'WebSocket rate limit check failed')
        return {
            allowed: false,
            errorMessage: 'Rate limit check failed',
            retryAfter: 1,
        }
    }
}

/**
 * Creates a rate limit error response for WebSocket
 * @param errorMessage - Error message
 * @param retryAfter - Retry after seconds
 * @param event - Original event name
 * @returns WebSocket error response object
 */
export const createWsRateLimitErrorResponse = (
    errorMessage: string,
    retryAfter: number,
    event: string,
): WsResponseData => {
    return {
        data: null,
        error: createWsErrorEnvelope(
            'rate_limited',
            `${errorMessage}. Try again in ${String(retryAfter)} seconds.`,
            {
                reason: 'rate_limit_exceeded',
            },
        ),
        event: event,
        status: 'error',
        timestamp: new Date().getTime(),
    }
}
