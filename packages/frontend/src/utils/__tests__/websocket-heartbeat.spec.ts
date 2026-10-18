import { useWebSocket } from '@vueuse/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import {
    HEARTBEAT_INTERVAL_MS,
    HEARTBEAT_PONG_TIMEOUT_MS,
    createHeartbeatOptions,
} from '../websocket-heartbeat'

// WebSocket whose handshake completes only when the test calls finishHandshake().
class FakeWebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3
    static instances: FakeWebSocket[] = []

    readyState = FakeWebSocket.CONNECTING
    binaryType = 'blob'
    sent: unknown[] = []
    onopen: ((ev: Event) => void) | null = null
    onclose: ((ev: CloseEvent) => void) | null = null
    onerror: ((ev: Event) => void) | null = null
    onmessage: ((ev: MessageEvent) => void) | null = null

    constructor(public url: string) {
        FakeWebSocket.instances.push(this)
    }

    send(data: unknown): void {
        this.sent.push(data)
    }

    close(): void {
        this.readyState = FakeWebSocket.CLOSED
        this.onclose?.(new CloseEvent('close'))
    }

    finishHandshake(): void {
        this.readyState = FakeWebSocket.OPEN
        this.onopen?.(new Event('open'))
    }
}

describe('websocket heartbeat', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        FakeWebSocket.instances = []
        vi.stubGlobal('WebSocket', FakeWebSocket)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('does not close a socket whose handshake is still in progress', () => {
        const scope = effectScope()
        const socket = scope.run(() =>
            useWebSocket('ws://example.test/ws', {
                immediate: false,
                heartbeat: createHeartbeatOptions(),
            }),
        )!

        // Connect late (after the first heartbeat tick would have fired) and keep
        // the handshake pending for longer than the pong timeout.
        vi.advanceTimersByTime(12_000)
        socket.open()
        const ws = FakeWebSocket.instances[0]!
        vi.advanceTimersByTime(HEARTBEAT_PONG_TIMEOUT_MS + 1_000)

        expect(ws.readyState).toBe(FakeWebSocket.CONNECTING)
        expect(socket.status.value).toBe('CONNECTING')

        // After the handshake the heartbeat runs: ping every interval, pong keeps it open.
        ws.finishHandshake()
        expect(socket.status.value).toBe('OPEN')
        vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS)
        expect(ws.sent).toContain('ping')
        ws.onmessage?.(new MessageEvent('message', { data: 'pong' }))
        vi.advanceTimersByTime(HEARTBEAT_PONG_TIMEOUT_MS + 1_000)
        expect(ws.readyState).toBe(FakeWebSocket.OPEN)

        scope.stop()
    })

    it('closes an open socket that stops answering pings', () => {
        const scope = effectScope()
        const socket = scope.run(() =>
            useWebSocket('ws://example.test/ws', {
                immediate: false,
                heartbeat: createHeartbeatOptions(),
            }),
        )!

        socket.open()
        const ws = FakeWebSocket.instances[0]!
        ws.finishHandshake()

        vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS + HEARTBEAT_PONG_TIMEOUT_MS + 100)

        expect(ws.readyState).toBe(FakeWebSocket.CLOSED)
        scope.stop()
    })
})
