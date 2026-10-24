import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as RateLimitConfig from '#config/rate-limit.js'

vi.mock('#vendor/utils/logger.js', () => ({
    default: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('#config/rate-limit.js', () => ({
    default: {
        httpGlobal: { windowMs: 60_000, max: 1 },
        wsUpgrade: { windowMs: 60_000, max: 2 },
        configError: null,
    },
}))

beforeEach(() => {
    vi.resetModules()
    vi.useRealTimers()
})

describe('checkUpgradeRateLimit', () => {
    it('allows max upgrades per IP, then reports limited with Retry-After', async () => {
        const check = (await import('./upgrade-rate-limit.js')).default
        expect(check('10.1.0.1')).toEqual({ kind: 'allowed' })
        expect(check('10.1.0.1')).toEqual({ kind: 'allowed' })
        expect(check('10.1.0.1')).toEqual({ kind: 'limited', retryAfter: 60 })
        expect(check('10.1.0.2')).toEqual({ kind: 'allowed' })
    })

    it('has its own budget, independent of HTTP L1', async () => {
        const check = (await import('./upgrade-rate-limit.js')).default
        const { checkGlobalRateLimit } = await import('./http-rate-limit.js')
        const responseData = {
            headers: [],
            setHeader: vi.fn(),
        } as unknown as Parameters<typeof checkGlobalRateLimit>[1]
        // L1 is used up (max 1) ...
        checkGlobalRateLimit('10.1.0.3', responseData)
        expect(checkGlobalRateLimit('10.1.0.3', responseData)).toBe(false)
        // ... but upgrades from the same IP still pass.
        expect(check('10.1.0.3')).toEqual({ kind: 'allowed' })
    })

    it('recovers after the window', async () => {
        vi.useFakeTimers({ now: 1_000_000 })
        const check = (await import('./upgrade-rate-limit.js')).default
        check('10.1.0.4')
        check('10.1.0.4')
        expect(check('10.1.0.4').kind).toBe('limited')
        vi.advanceTimersByTime(60_000)
        expect(check('10.1.0.4')).toEqual({ kind: 'allowed' })
    })

    it('reports unavailable when the store fails', async () => {
        const { rateLimitStore } = await import('./rate-limit-store.js')
        vi.spyOn(rateLimitStore, 'consume').mockImplementationOnce(() => {
            throw new Error('boom')
        })
        const check = (await import('./upgrade-rate-limit.js')).default
        expect(check('10.1.0.5')).toEqual({ kind: 'unavailable' })
    })
})

describe('default upgrade budget', () => {
    it('survives three tabs reconnecting every 5 s behind one IP', async () => {
        const { default: actual } =
            await vi.importActual<typeof RateLimitConfig>('#config/rate-limit.js')
        const { createRateLimitStore } = await import('./rate-limit-store.js')
        let time = 0
        const store = createRateLimitStore({ now: () => time })
        const options = {
            windowMs: actual.wsUpgrade.windowMs,
            max: actual.wsUpgrade.max,
        }

        // The frontend retries 5 s after a close (useWebSocketConnection.ts); two minutes.
        for (; time < 120_000; time += 5_000) {
            for (let tab = 0; tab < 3; tab++) {
                expect(store.consume('upgrade:203.0.113.7', options).allowed).toBe(true)
            }
        }
    })
})
