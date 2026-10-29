import { type } from '@arktype/type'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { logger, sentry } = vi.hoisted(() => ({
    logger: { warn: vi.fn(), error: vi.fn() },
    sentry: { captureMessage: vi.fn(), enabled: true },
}))

vi.mock('#vendor/utils/logger.js', () => ({ default: logger }))
vi.mock('#app/services/observability/sentry-service.js', () => ({
    sentryService: {
        // The real service is a no-op while Sentry is off; mirror that here.
        captureMessage: (...args: unknown[]) => {
            if (sentry.enabled) sentry.captureMessage(...args)
        },
    },
}))

const { createResponseCheck, __resetResponseValidationLog, RESPONSE_VALIDATION_LOG_WINDOW_MS } =
    await import('./validate-response.js')

const schema = type({ id: 'number', email: 'string' })
const meta = { route: 'api/users', transport: 'http' as const, requestId: 'req-1' }
const invalid = { id: 'secret-value-123', email: 'leak@example.com' }

beforeEach(() => {
    vi.clearAllMocks()
    sentry.enabled = true
    __resetResponseValidationLog()
})

describe('createResponseCheck', () => {
    it('returns null in off mode and without a schema', () => {
        expect(createResponseCheck(schema, { mode: 'off', sampleRate: 1 })).toBeNull()
        expect(createResponseCheck(undefined, { mode: 'strict', sampleRate: 1 })).toBeNull()
    })

    it('passes a valid payload without logging', () => {
        const check = createResponseCheck(schema, { mode: 'strict', sampleRate: 1 })
        expect(check?.({ id: 1, email: 'a@b.c' }, meta)).toBe(true)
        expect(logger.error).not.toHaveBeenCalled()
        expect(sentry.captureMessage).not.toHaveBeenCalled()
    })

    it('strict rejects an invalid payload and logs an error', () => {
        const check = createResponseCheck(schema, { mode: 'strict', sampleRate: 1 })
        expect(check?.(invalid, meta)).toBe(false)
        expect(logger.error).toHaveBeenCalledOnce()
        const [entry] = logger.error.mock.calls[0] as [Record<string, unknown>]
        expect(entry).toMatchObject({ route: 'api/users', mode: 'strict', requestId: 'req-1' })
        expect(entry['issues']).toEqual([{ path: 'id', code: 'domain', expected: 'a number' }])
    })

    it('log keeps an invalid payload and logs a warn', () => {
        const check = createResponseCheck(schema, { mode: 'log', sampleRate: 1 })
        expect(check?.(invalid, meta)).toBe(true)
        expect(logger.warn).toHaveBeenCalledOnce()
        expect(logger.error).not.toHaveBeenCalled()
    })

    it('never puts response values into the log or the Sentry event', () => {
        const check = createResponseCheck(schema, { mode: 'strict', sampleRate: 1 })
        check?.(invalid, meta)
        const logged = JSON.stringify(logger.error.mock.calls)
        const sent = JSON.stringify(sentry.captureMessage.mock.calls)
        for (const text of [logged, sent]) {
            expect(text).not.toContain('secret-value-123')
            expect(text).not.toContain('leak@example.com')
        }
    })

    it('does not mutate or replace the payload with the schema output', () => {
        const morph = type({ n: 'string' }).pipe((value) => ({ n: Number(value.n) }))
        const check = createResponseCheck(morph, { mode: 'strict', sampleRate: 1 })
        const payload = { n: '5' }
        expect(check?.(payload, meta)).toBe(true)
        expect(payload).toEqual({ n: '5' })
    })

    it('logs once per route within the window and counts the rest', () => {
        let clock = 1_000
        const check = createResponseCheck(schema, {
            mode: 'log',
            sampleRate: 1,
            now: () => clock,
        })
        check?.(invalid, meta)
        check?.(invalid, meta)
        check?.(invalid, meta)
        expect(logger.warn).toHaveBeenCalledOnce()

        check?.(invalid, { ...meta, route: 'api/other' })
        expect(logger.warn).toHaveBeenCalledTimes(2)

        clock += RESPONSE_VALIDATION_LOG_WINDOW_MS
        check?.(invalid, meta)
        expect(logger.warn).toHaveBeenCalledTimes(3)
        const [entry] = logger.warn.mock.calls[2] as [Record<string, unknown>]
        expect(entry['suppressed']).toBe(2)
    })

    describe('sampling', () => {
        it('log + rate 0 never calls the schema', () => {
            const spy = vi.fn((value: unknown) => schema(value))
            const check = createResponseCheck(spy as unknown as typeof schema, {
                mode: 'log',
                sampleRate: 0,
            })
            for (let i = 0; i < 20; i++) check?.(invalid, meta)
            expect(spy).not.toHaveBeenCalled()
        })

        it('log + rate 1 always calls the schema', () => {
            const spy = vi.fn((value: unknown) => schema(value))
            const check = createResponseCheck(spy as unknown as typeof schema, {
                mode: 'log',
                sampleRate: 1,
                random: () => 0.999,
            })
            for (let i = 0; i < 5; i++) check?.(invalid, meta)
            expect(spy).toHaveBeenCalledTimes(5)
        })

        it('log + rate 0.5 follows the random source', () => {
            const spy = vi.fn((value: unknown) => schema(value))
            const values = [0.1, 0.9]
            const check = createResponseCheck(spy as unknown as typeof schema, {
                mode: 'log',
                sampleRate: 0.5,
                random: () => values.shift() ?? 0,
            })
            check?.(invalid, meta)
            check?.(invalid, meta)
            expect(spy).toHaveBeenCalledOnce()
        })

        it('strict ignores the sample rate', () => {
            const spy = vi.fn((value: unknown) => schema(value))
            const check = createResponseCheck(spy as unknown as typeof schema, {
                mode: 'strict',
                sampleRate: 0,
            })
            expect(check?.(invalid, meta)).toBe(false)
            expect(spy).toHaveBeenCalledOnce()
        })
    })

    describe('Sentry', () => {
        it('sends an event tagged response_validation', () => {
            const check = createResponseCheck(schema, { mode: 'strict', sampleRate: 1 })
            check?.(invalid, meta)
            expect(sentry.captureMessage).toHaveBeenCalledOnce()
            const [, level, ctx] = sentry.captureMessage.mock.calls[0] as [
                string,
                string,
                Record<string, unknown>,
            ]
            expect(level).toBe('error')
            expect(ctx).toMatchObject({
                route: 'api/users',
                requestId: 'req-1',
                tags: { response_validation: 'strict', transport: 'http' },
            })
        })

        it('skips the log stream so the error is not sent twice', () => {
            const check = createResponseCheck(schema, { mode: 'strict', sampleRate: 1 })
            check?.(invalid, meta)
            const [entry] = logger.error.mock.calls[0] as [Record<string, unknown>]
            expect(entry['sentrySkip']).toBe(true)
        })

        it('shares the deduplication window with the log', () => {
            const check = createResponseCheck(schema, {
                mode: 'log',
                sampleRate: 1,
                now: () => 5_000,
            })
            for (let i = 0; i < 4; i++) check?.(invalid, meta)
            expect(sentry.captureMessage).toHaveBeenCalledOnce()
            expect(sentry.captureMessage.mock.calls[0]?.[1]).toBe('warning')
        })

        it('with Sentry off still logs', () => {
            sentry.enabled = false
            const check = createResponseCheck(schema, { mode: 'log', sampleRate: 1 })
            check?.(invalid, meta)
            expect(sentry.captureMessage).not.toHaveBeenCalled()
            expect(logger.warn).toHaveBeenCalledOnce()
        })
    })
})
