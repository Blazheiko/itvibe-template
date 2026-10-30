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

const {
    createResponseCheck,
    isUndeclaredKey,
    __resetResponseValidationLog,
    RESPONSE_VALIDATION_LOG_WINDOW_MS,
    RESPONSE_VALIDATION_MAX_ISSUES,
} = await import('./validate-response.js')

const schema = type({ id: 'number', email: 'string' })
const meta = { route: 'api/users', transport: 'http' as const, requestId: 'req-1' }
const invalid = { id: 'secret-value-123', email: 'leak@example.com' }
const valid = { id: 1, email: 'a@b.c' }
const withExtra = { id: 1, email: 'a@b.c', passwordHash: 'hash-value-456' }

const ListSchema = type.or(
    {
        status: "'ok'",
        items: type({ id: 'number', nested: { name: 'string' } }).array(),
    },
    { status: "'error'", message: 'string' },
)

type Entry = Record<string, unknown> & { issues: { path: string; code: string }[] }
const lastEntry = (fn: typeof logger.warn): Entry => (fn.mock.calls.at(-1) as [Entry])[0]

beforeEach(() => {
    vi.clearAllMocks()
    sentry.enabled = true
    __resetResponseValidationLog()
})

describe('createResponseCheck', () => {
    it('returns null only without a schema', () => {
        expect(createResponseCheck(undefined, { mode: 'strict' })).toBeNull()
        expect(createResponseCheck(undefined, { mode: 'log' })).toBeNull()
        expect(createResponseCheck(schema, { mode: 'log' })).toBeTypeOf('function')
    })

    it.each(['strict', 'log'] as const)(
        '%s sends the same object for a valid payload, without logging',
        (mode) => {
            const check = createResponseCheck(schema, { mode })
            const payload = { ...valid }
            const result = check?.(payload, meta)
            expect(result).toEqual({ ok: true, payload })
            expect(result?.ok === true && result.payload).toBe(payload)
            expect(logger.warn).not.toHaveBeenCalled()
            expect(logger.error).not.toHaveBeenCalled()
        },
    )

    it.each(['strict', 'log'] as const)('%s rejects a schema mismatch', (mode) => {
        const check = createResponseCheck(schema, { mode })
        expect(check?.(invalid, meta)).toEqual({ ok: false })
        expect(logger.error).toHaveBeenCalledOnce()
        expect(lastEntry(logger.error)).toMatchObject({
            route: 'api/users',
            mode,
            kind: 'mismatch',
            rejected: true,
            requestId: 'req-1',
            issues: [{ path: 'id', code: 'domain', expected: 'a number' }],
        })
    })

    it.each(['strict', 'log'] as const)(
        '%s rejects an undeclared key together with a mismatch (no original payload)',
        (mode) => {
            const check = createResponseCheck(schema, { mode })
            expect(check?.({ ...invalid, passwordHash: 'x' }, meta)).toEqual({ ok: false })
            expect(lastEntry(logger.error)['kind']).toBe('mismatch')
        },
    )

    it('strict rejects an undeclared key and logs its path', () => {
        const check = createResponseCheck(schema, { mode: 'strict' })
        expect(check?.(withExtra, meta)).toEqual({ ok: false })
        expect(lastEntry(logger.error)).toMatchObject({
            kind: 'undeclared',
            rejected: true,
            issues: [{ path: 'passwordHash', code: 'undeclared_key' }],
        })
    })

    it('log strips undeclared keys at every depth and in each union branch', () => {
        const check = createResponseCheck(ListSchema, { mode: 'log' })
        const payload = {
            status: 'ok',
            secret: 1,
            items: [{ id: 1, nested: { name: 'a', token: 't' }, passwordHash: 'h' }],
        }
        const result = check?.(payload, meta)
        expect(result).toEqual({
            ok: true,
            payload: { status: 'ok', items: [{ id: 1, nested: { name: 'a' } }] },
        })
        expect(logger.warn).toHaveBeenCalledOnce()
        expect(lastEntry(logger.warn)).toMatchObject({ kind: 'undeclared', rejected: false })
        expect(
            lastEntry(logger.warn)
                .issues.map((issue) => issue.path)
                .sort(),
        ).toEqual(['items[0].nested.token', 'items[0].passwordHash', 'secret'])

        const error = check?.({ status: 'error', message: 'm', stack: 's' }, meta)
        expect(error).toEqual({ ok: true, payload: { status: 'error', message: 'm' } })
    })

    it('log does not mutate the handler object and keeps Date values', () => {
        const check = createResponseCheck(type({ at: 'Date', id: 'number' }), { mode: 'log' })
        const at = new Date(0)
        const payload = { at, id: 1, extra: true }
        const result = check?.(payload, meta)
        expect(payload).toEqual({ at, id: 1, extra: true })
        // The copy holds a new Date with the same time: it serializes the same way.
        const sent = result?.ok === true ? (result.payload as { at: unknown }).at : null
        expect(sent).toBeInstanceOf(Date)
        expect(sent).toEqual(at)
    })

    it('log rejects when strip fails (fail-closed for both schema calls)', () => {
        const check = createResponseCheck(schema, {
            mode: 'log',
            strip: (value) => type('number')(value),
        })
        expect(check?.(withExtra, meta)).toEqual({ ok: false })
        expect(logger.error).toHaveBeenCalledOnce()
    })

    it('does not filter the content of an unknown field (guarantee limit, plan §4.5)', () => {
        const check = createResponseCheck(type({ 'data?': 'unknown' }), { mode: 'log' })
        const payload = { data: { leak: 1 } }
        expect(check?.(payload, meta)).toEqual({ ok: true, payload })
    })

    it('keeps at most RESPONSE_VALIDATION_MAX_ISSUES paths and counts the rest', () => {
        const check = createResponseCheck(ListSchema, { mode: 'log' })
        const items = Array.from({ length: 25 }, (_, i) => ({
            id: i,
            nested: { name: 'a' },
            extra: i,
        }))
        check?.({ status: 'ok', items }, meta)
        const entry = lastEntry(logger.warn)
        expect(entry.issues).toHaveLength(RESPONSE_VALIDATION_MAX_ISSUES)
        expect(entry['truncated']).toBe(25 - RESPONSE_VALIDATION_MAX_ISSUES)
    })

    it('never puts response values into the log or the Sentry event', () => {
        for (const mode of ['strict', 'log'] as const) {
            const check = createResponseCheck(schema, { mode })
            check?.(invalid, meta)
            check?.(withExtra, { ...meta, route: `api/${mode}` })
        }
        const text = JSON.stringify([
            logger.error.mock.calls,
            logger.warn.mock.calls,
            sentry.captureMessage.mock.calls,
        ])
        for (const value of ['secret-value-123', 'leak@example.com', 'hash-value-456']) {
            expect(text).not.toContain(value)
        }
    })

    it('logs once per route and kind within the window and counts the rest', () => {
        let clock = 1_000
        const check = createResponseCheck(schema, { mode: 'log', now: () => clock })
        check?.(withExtra, meta)
        check?.(withExtra, meta)
        check?.(withExtra, meta)
        expect(logger.warn).toHaveBeenCalledOnce()

        // A stripped response does not hide a 500 of the same route.
        check?.(invalid, meta)
        expect(logger.error).toHaveBeenCalledOnce()

        check?.(withExtra, { ...meta, route: 'api/other' })
        expect(logger.warn).toHaveBeenCalledTimes(2)

        clock += RESPONSE_VALIDATION_LOG_WINDOW_MS
        check?.(withExtra, meta)
        expect(logger.warn).toHaveBeenCalledTimes(3)
        expect(lastEntry(logger.warn)['suppressed']).toBe(2)
    })

    describe('keys named like Object.prototype members (reviewer P1)', () => {
        const nestedSchema = type({ id: 'number', n: { a: 'string' } })
        const keys = [...Object.getOwnPropertyNames(Object.prototype), '__proto__']
        // JSON.parse creates `__proto__` as an own key, like a row or request body would.
        const payloadWith = (key: string): unknown =>
            JSON.parse(
                `{"id":1,"n":{"a":"x","${key}":{"s":"nested-secret"}},"${key}":{"passwordHash":"top-secret"}}`,
            )

        it.each(keys)('log strips %s at the top level and nested', (key) => {
            const check = createResponseCheck(nestedSchema, { mode: 'log' })
            const result = check?.(payloadWith(key), meta)
            expect(result?.ok).toBe(true)
            const sent = JSON.stringify(result?.ok === true ? result.payload : null)
            expect(sent).toBe('{"id":1,"n":{"a":"x"}}')
            expect(
                lastEntry(logger.warn)
                    .issues.map((issue) => issue.path)
                    .sort(),
            ).toEqual([key, `n.${key}`].sort())
        })

        it.each(keys)('strict answers %s with a 500', (key) => {
            const check = createResponseCheck(nestedSchema, { mode: 'strict' })
            expect(check?.(payloadWith(key), meta)).toEqual({ ok: false })
        })

        it('strips them inside array items too', () => {
            const check = createResponseCheck(ListSchema, { mode: 'log' })
            const payload = JSON.parse(
                '{"status":"ok","items":[{"id":1,"nested":{"name":"a"},"constructor":{"x":"secret"}}]}',
            ) as unknown
            const result = check?.(payload, meta)
            expect(JSON.stringify(result?.ok === true ? result.payload : null)).not.toContain(
                'secret',
            )
        })
    })

    describe('objects that serialize another structure (reviewer P2)', () => {
        it.each(['strict', 'log'] as const)('%s rejects a class instance with toJSON', (mode) => {
            class Dto {
                id = 1
                email = 'a@b.c'
                toJSON(): Record<string, unknown> {
                    return { id: this.id, email: this.email, passwordHash: 'proto-secret' }
                }
            }
            const check = createResponseCheck(schema, { mode })
            expect(check?.(new Dto(), meta)).toEqual({
                ok: false,
            })
            expect(lastEntry(logger.error).issues[0]).toMatchObject({ code: 'unsafe_prototype' })
        })

        it('rejects a nested non-plain object but accepts Date and null-prototype objects', () => {
            const check = createResponseCheck(type({ at: 'Date', n: { a: 'string' } }), {
                mode: 'log',
            })
            class Inner {
                a = 'x'
            }
            expect(check?.({ at: new Date(0), n: new Inner() }, meta)).toEqual({ ok: false })
            const bare = Object.assign(Object.create(null) as object, { a: 'x' })
            expect(check?.({ at: new Date(0), n: bare }, meta).ok).toBe(true)
        })
    })

    describe('ArkType contract (guard)', () => {
        it('reports an undeclared key as predicate + removed', () => {
            const result = type({ a: 'string' }).onDeepUndeclaredKey('reject')({ a: 'x', b: 1 })
            expect(result).toBeInstanceOf(type.errors)
            const errors = result as InstanceType<typeof type.errors>
            expect(errors.map((error) => [error.code, error.expected])).toEqual([
                ['predicate', 'removed'],
            ])
            expect(errors.every(isUndeclaredKey)).toBe(true)
        })

        it('reports a type mismatch with another code', () => {
            const result = type({ a: 'string' }).onDeepUndeclaredKey('reject')({ a: 1 })
            const errors = result as InstanceType<typeof type.errors>
            expect(errors.some(isUndeclaredKey)).toBe(false)
        })
    })

    describe('Sentry', () => {
        it('sends an error event for a 500 and a warning for a stripped response', () => {
            const check = createResponseCheck(schema, { mode: 'log' })
            check?.(invalid, meta)
            check?.(withExtra, meta)
            const calls = sentry.captureMessage.mock.calls as [
                string,
                string,
                Record<string, unknown>,
            ][]
            expect(calls.map((call) => call[1])).toEqual(['error', 'warning'])
            expect(calls[0]?.[2]).toMatchObject({
                route: 'api/users',
                requestId: 'req-1',
                tags: { response_validation: 'log', transport: 'http', kind: 'mismatch' },
            })
            expect(calls[1]?.[2]).toMatchObject({ tags: { kind: 'undeclared' } })
        })

        it('skips the log stream so the event is not sent twice', () => {
            const check = createResponseCheck(schema, { mode: 'strict' })
            check?.(invalid, meta)
            expect(lastEntry(logger.error)['sentrySkip']).toBe(true)
        })

        it('with Sentry off still logs', () => {
            sentry.enabled = false
            const check = createResponseCheck(schema, { mode: 'log' })
            check?.(withExtra, meta)
            expect(sentry.captureMessage).not.toHaveBeenCalled()
            expect(logger.warn).toHaveBeenCalledOnce()
        })
    })
})
