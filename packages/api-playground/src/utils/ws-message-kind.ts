export type WsMessageKind = 'service-error' | 'broadcast' | 'service' | 'api' | 'unknown'

/**
 * Routes an incoming WS message. An API response echoes the request event, which carries
 * the configured prefix (`api/...`, `v1/...`), so it is recognised by its pending request,
 * not by a hard-coded `api` prefix.
 */
export const classifyWsMessage = (event: string, isPending: boolean): WsMessageKind => {
    if (event === 'service:error') return 'service-error'
    if (event.startsWith('broadcast:')) return 'broadcast'
    if (event.startsWith('service:')) return 'service'
    return isPending ? 'api' : 'unknown'
}
