import { type } from '@arktype/type'
import type { BaseType } from '@arktype/type'
import { sentryService } from '#app/services/observability/sentry-service.js'
import type { ResponseValidationMode } from '#config/response-validation.js'
import logger from '#vendor/utils/logger.js'

// Runtime check of a handler result against the route ResponseSchema
// (docs/plan/strip-response-fields-plan.md §4.3). It checks the object the handler
// returned, before JSON serialization:
//  1. `reject` passes → the original object is sent, no copy;
//  2. any error other than an undeclared key → 500 in both modes;
//  3. only undeclared keys → 500 in strict, `strip` output in log.
// The original object is sent only after a successful `reject`: correct while response
// schemas have no morphs (a guard test in validate-response.spec.ts keeps it so).

export interface ResponseCheckMeta {
    route: string
    transport: 'http' | 'ws'
    requestId?: string | undefined
}

/** `payload` is what to send: the original object or its stripped copy; `ok: false` → 500. */
export type ResponseCheckResult = { ok: true; payload: unknown } | { ok: false }

export type ResponseCheck = (payload: unknown, meta: ResponseCheckMeta) => ResponseCheckResult

export interface ResponseCheckOptions {
    mode: ResponseValidationMode
    /** Test hooks. */
    now?: () => number
    /** Replaces `schema.onDeepUndeclaredKey('delete')`, to test a failing strip. */
    strip?: (payload: unknown) => unknown
}

export interface ResponseIssue {
    path: string
    code: string
    expected: string
}

/** One log line and one Sentry event per route and kind within this window. */
export const RESPONSE_VALIDATION_LOG_WINDOW_MS = 60_000

/** Paths kept per log entry; the rest is counted in `truncated`. */
export const RESPONSE_VALIDATION_MAX_ISSUES = 20

/** Log code of an undeclared key, to filter them from schema mismatches. */
export const UNDECLARED_KEY_CODE = 'undeclared_key'

type SchemaErrors = InstanceType<typeof type.errors>
type SchemaError = SchemaErrors[number]

// ArkType reports an undeclared key under onDeepUndeclaredKey('reject') as
// `predicate` + `removed`; not a documented contract, so a test pins it.
export const isUndeclaredKey = (error: Pick<SchemaError, 'code' | 'expected'>): boolean =>
    error.code === 'predicate' && error.expected === 'removed'

type IssueKind = 'mismatch' | 'undeclared'

interface RouteLogState {
    lastAt: number
    suppressed: number
}

const logState = new Map<string, RouteLogState>()

export const __resetResponseValidationLog = (): void => {
    logState.clear()
}

// Paths, codes and expected types only: `actual` may carry response values (PII).
const summarize = (errors: SchemaErrors): { issues: ResponseIssue[]; truncated: number } => ({
    issues: errors.slice(0, RESPONSE_VALIDATION_MAX_ISSUES).map((error) => ({
        path: error.propString === '' ? '(root)' : error.propString,
        code: isUndeclaredKey(error) ? UNDECLARED_KEY_CODE : error.code,
        expected: error.expected,
    })),
    truncated: Math.max(0, errors.length - RESPONSE_VALIDATION_MAX_ISSUES),
})

const report = (
    mode: ResponseValidationMode,
    kind: IssueKind,
    rejected: boolean,
    meta: ResponseCheckMeta,
    errors: SchemaErrors,
    now: number,
): void => {
    // A stripped response (warn) must not hide a 500 of the same route, so each kind
    // has its own window.
    const key = `${meta.transport}:${meta.route}:${kind}`
    const state = logState.get(key)
    if (state !== undefined && now - state.lastAt < RESPONSE_VALIDATION_LOG_WINDOW_MS) {
        state.suppressed += 1
        return
    }
    const suppressed = state?.suppressed ?? 0
    logState.set(key, { lastAt: now, suppressed: 0 })

    const { issues, truncated } = summarize(errors)
    const entry = {
        route: meta.route,
        transport: meta.transport,
        requestId: meta.requestId,
        mode,
        kind,
        rejected,
        issues,
        truncated,
        suppressed,
        // The Sentry event is sent below with its own tag, not from the log stream.
        sentrySkip: true,
    }
    const message =
        kind === 'undeclared'
            ? 'Response has keys undeclared in ResponseSchema'
            : 'Response does not match ResponseSchema'
    if (rejected) logger.error(entry, message)
    else logger.warn(entry, message)

    sentryService.captureMessage(message, rejected ? 'error' : 'warning', {
        requestId: meta.requestId,
        route: meta.route,
        tags: { response_validation: mode, transport: meta.transport, kind },
        extra: { issues, truncated, suppressed },
    })
}

export const createResponseCheck = (
    schema: BaseType | undefined,
    options: ResponseCheckOptions,
): ResponseCheck | null => {
    if (schema === undefined) return null
    const { mode } = options
    const now = options.now ?? Date.now
    const reject = schema.onDeepUndeclaredKey('reject')
    const strip = mode === 'log' ? (options.strip ?? schema.onDeepUndeclaredKey('delete')) : null

    return (payload, meta) => {
        const checked: unknown = reject(payload)
        if (!(checked instanceof type.errors)) return { ok: true, payload }

        if (!checked.every(isUndeclaredKey)) {
            report(mode, 'mismatch', true, meta, checked, now())
            return { ok: false }
        }
        if (strip === null) {
            report(mode, 'undeclared', true, meta, checked, now())
            return { ok: false }
        }
        const stripped: unknown = strip(payload)
        // Should not fail after a reject with only undeclared keys, but stay fail-closed.
        if (stripped instanceof type.errors) {
            report(mode, 'mismatch', true, meta, stripped, now())
            return { ok: false }
        }
        report(mode, 'undeclared', false, meta, checked, now())
        return { ok: true, payload: stripped }
    }
}
