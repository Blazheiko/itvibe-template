// What to do after the WebSocket closed. A refused upgrade (expired session,
// code-issues item 18) never reaches the "open" state, and the browser reports
// it as 1006 without a reason — the same as an unreachable server — so a
// handshake that failed before opening is treated like 4001: refresh the WS
// token over HTTP. Only the first such failure in a row refreshes at once;
// later ones wait, so an unreachable WS endpoint with a working HTTP API does
// not turn into a tight refresh loop.
export type WebSocketCloseAction =
    | { kind: 'refresh-token'; delayMs: number }
    | { kind: 'stop' }
    | { kind: 'reconnect'; delayMs: number }

export const WS_RETRY_DELAY_MS = 5000

export const resolveWebSocketCloseAction = (
    code: number,
    wasOpened: boolean,
    handshakeFailuresInARow: number,
): WebSocketCloseAction => {
    if (code === 4001) return { kind: 'refresh-token', delayMs: 0 }
    if (code >= 4000 && code < 4100) return { kind: 'stop' }
    if (!wasOpened && code === 1006) {
        return {
            kind: 'refresh-token',
            delayMs: handshakeFailuresInARow > 1 ? WS_RETRY_DELAY_MS : 0,
        }
    }
    return { kind: 'reconnect', delayMs: WS_RETRY_DELAY_MS }
}
