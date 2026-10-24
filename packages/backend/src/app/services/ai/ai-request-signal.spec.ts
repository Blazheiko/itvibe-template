import { describe, expect, it } from 'vitest'

import { aiAbortKind, aiRequestSignal } from './ai-request-signal.js'

describe('aiRequestSignal', () => {
    it('aborts with a TimeoutError after the timeout', async () => {
        const signal = aiRequestSignal(undefined, 20)
        await new Promise((resolve) => setTimeout(resolve, 60))
        expect(signal.aborted).toBe(true)
        expect(aiAbortKind(signal.reason)).toBe('timeout')
    })

    it("follows the caller's signal", () => {
        const controller = new AbortController()
        const signal = aiRequestSignal(controller.signal, 10_000)
        expect(signal.aborted).toBe(false)
        controller.abort()
        expect(signal.aborted).toBe(true)
        expect(aiAbortKind(signal.reason)).toBe('aborted')
    })
})

describe('aiAbortKind', () => {
    it('finds the abort in a wrapped cause', () => {
        const wrapped = new Error('request failed', {
            cause: new DOMException('timed out', 'TimeoutError'),
        })
        expect(aiAbortKind(wrapped)).toBe('timeout')
    })

    it('is null for other errors', () => {
        expect(aiAbortKind(new Error('HTTP 500'))).toBeNull()
        expect(aiAbortKind('boom')).toBeNull()
    })
})
