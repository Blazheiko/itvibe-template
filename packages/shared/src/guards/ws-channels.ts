// WebSocket pub/sub channels the server may publish to. Plain data and a type
// guard, no dependencies, so the frontend can import it without extra weight.
export const WS_CHANNELS = ['admin'] as const

export type WsChannel = (typeof WS_CHANNELS)[number]

const WS_CHANNEL_SET: ReadonlySet<string> = new Set(WS_CHANNELS)

export const isWsChannel = (value: unknown): value is WsChannel =>
    typeof value === 'string' && WS_CHANNEL_SET.has(value)
