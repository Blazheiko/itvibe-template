// Benchmark of the response contract check (feat-046 §4.7): JSON.stringify against the
// feat-044 check, the `reject` check of a clean response and the whole path of a response
// with undeclared keys (reject → strip → paths). Medians of 7 runs after a warm-up.
import { type } from '@arktype/type'

const ErrorSchema = type({
    status: "'error'",
    code: "'bad_request' | 'not_found' | 'internal_error'",
    message: 'string',
    'reason?': 'string',
    'details?': 'unknown',
})
const ItemSchema = type({
    id: 'string',
    userId: 'string',
    endpoint: 'string',
    userAgent: 'string | null',
    isActive: 'boolean',
    lastUsedAt: 'Date | null',
    createdAt: 'Date',
    notificationTypes: "('mention' | 'system')[] | null",
})
const Schema = type.or(
    { status: "'success'", 'message?': 'string', items: ItemSchema.array(), total: 'number' },
    ErrorSchema,
)
const reject = Schema.onDeepUndeclaredKey('reject')
const strip = Schema.onDeepUndeclaredKey('delete')

const isUndeclaredKey = (error: { code: string; expected: string }): boolean =>
    error.code === 'predicate' && error.expected === 'removed'

const fullPath = (payload: unknown): unknown => {
    const checked = reject(payload)
    if (!(checked instanceof type.errors)) return payload
    if (!checked.every(isUndeclaredKey)) return null
    const paths = checked.slice(0, 20).map((error) => error.propString)
    const stripped = strip(payload)
    return stripped instanceof type.errors ? null : [stripped, paths]
}

const makePayload = (count: number, withExtraKey: boolean): unknown => ({
    status: 'success',
    total: count,
    items: Array.from({ length: count }, (_, i) => ({
        id: `id${String(i)}`,
        userId: `u${String(i)}`,
        endpoint: `https://push.example/${String(i)}`,
        userAgent: 'Mozilla/5.0',
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        notificationTypes: ['mention'],
        ...(withExtraKey ? { passwordHash: 'x' } : {}),
    })),
})

const median = (
    fn: (payload: unknown) => unknown,
    payload: unknown,
    iterations: number,
): number => {
    for (let i = 0; i < 200; i++) fn(payload)
    const runs: number[] = []
    for (let run = 0; run < 7; run++) {
        const start = process.hrtime.bigint()
        for (let i = 0; i < iterations; i++) fn(payload)
        runs.push(Number(process.hrtime.bigint() - start) / iterations / 1e6)
    }
    runs.sort((a, b) => a - b)
    return runs[3] ?? 0
}

const rows = [10, 100, 1000].map((count) => {
    const iterations = count === 1000 ? 300 : 3000
    const clean = makePayload(count, false)
    const dirty = makePayload(count, true)
    const json = median((payload) => JSON.stringify(payload), clean, iterations)
    const check = median((payload) => Schema(payload), clean, iterations)
    const rejectMs = median((payload) => reject(payload), clean, iterations)
    const dirtyMs = median(fullPath, dirty, iterations)
    return {
        items: count,
        'json ms': json.toFixed(4),
        'feat-044 check ms': check.toFixed(4),
        'reject ms': rejectMs.toFixed(4),
        'reject / json': (rejectMs / json).toFixed(2),
        'reject / check': (rejectMs / check).toFixed(2),
        'undeclared path ms': dirtyMs.toFixed(4),
        'undeclared / json': (dirtyMs / json).toFixed(1),
    }
})

console.table(rows)
