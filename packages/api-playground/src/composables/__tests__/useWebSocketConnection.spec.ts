import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

// No queue for messages (decision R4, code-issues item 64): without an open
// connection sendMessage sends nothing, says so and returns false.
const status = ref<'OPEN' | 'CLOSED' | 'CONNECTING'>('CLOSED')
const send = vi.fn()
vi.mock('@vueuse/core', () => ({
    useWebSocket: () => ({ status, send, close: vi.fn(), open: vi.fn(), ws: ref(null) }),
    useIntervalFn: () => ({ pause: vi.fn(), resume: vi.fn() }),
}))

const { useWebSocketConnection } = await import('../useWebSocketConnection')
const message = { event: 'service:ping', timestamp: 1, payload: {} }

describe('playground sendMessage', () => {
    it('does not pretend to queue: returns false and logs an error when not connected', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {})
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        status.value = 'CLOSED'

        expect(useWebSocketConnection().sendMessage(message)).toBe(false)

        expect(send).not.toHaveBeenCalled()
        expect(error).toHaveBeenCalledWith(
            'WebSocket is not connected: message not sent',
            'service:ping',
        )
        expect(warn.mock.calls.some((call) => String(call[0]).includes('queued'))).toBe(false)
    })

    it('sends when the connection is open', () => {
        status.value = 'OPEN'
        expect(useWebSocketConnection().sendMessage(message)).toBe(true)
        expect(send).toHaveBeenCalledWith(JSON.stringify(message))
    })
})
