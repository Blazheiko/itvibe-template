import { describe, expect, it } from 'vitest'

import { abortConnection, connectionSignal } from './ws-connection-signal.js'

describe('connectionSignal', () => {
    it('gives one signal per connection and aborts it on close', () => {
        const ws = {}
        const other = {}
        const signal = connectionSignal(ws)
        expect(connectionSignal(ws)).toBe(signal)
        expect(connectionSignal(other)).not.toBe(signal)

        abortConnection(ws)

        expect(signal.aborted).toBe(true)
        expect(connectionSignal(other).aborted).toBe(false)
    })

    it('ignores closing a connection that never asked for a signal', () => {
        expect(() => {
            abortConnection({})
        }).not.toThrow()
    })
})
