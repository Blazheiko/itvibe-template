import { describe, expect, it } from 'vitest'
import { classifyWsMessage } from '../ws-message-kind'

describe('classifyWsMessage', () => {
    it('routes a response under a non-api prefix to the pending request', () => {
        expect(classifyWsMessage('v1/user/me', true)).toBe('api')
    })

    it('keeps service and broadcast events apart from API responses', () => {
        expect(classifyWsMessage('service:error', true)).toBe('service-error')
        expect(classifyWsMessage('service:pong', false)).toBe('service')
        expect(classifyWsMessage('broadcast:x', false)).toBe('broadcast')
    })

    it('ignores a response nobody waits for', () => {
        expect(classifyWsMessage('api/user/me', false)).toBe('unknown')
    })
})
