import { type } from '@arktype/type'
import type { BaseType } from '@arktype/type'
import { sentryService } from '#app/services/observability/sentry-service.js'
import type { ResponseValidationMode } from '#config/response-validation.js'
import logger from '#vendor/utils/logger.js'

// Runtime check of a handler result against the route ResponseSchema
// (docs/plan/response-schema-runtime-validation.md §4.2). It checks the object
// the handler returned, before JSON serialization, and never replaces it with
// the schema output (a morph must not change what is sent).

export interface ResponseCheckMeta {
    route: string
    transport: 'http' | 'ws'
    requestId?: string | undefined
}

/** false only in strict mode for an invalid result: the caller sends a 500 instead. */
export type ResponseCheck = (payload: unknown, meta: ResponseCheckMeta) => boolean

export interface ResponseCheckOptions {
    mode: ResponseValidationMode
    sampleRate: number
    /** Test hooks. */
    random?: () => number
    now?: () => number
}

export interface ResponseIssue {
    path: string
    code: string
    expected: string
}

/** One log line and one Sentry event per route within this window. */
export const RESPONSE_VALIDATION_LOG_WINDOW_MS = 60_000

interface RouteLogState {
    lastAt: number
    suppressed: number
}

const logState = new Map<string, RouteLogState>()

export const __resetResponseValidationLog = (): void => {
    logState.clear()
}

// Paths, codes and expected types only: `actual` may carry response values (PII).
const summarize = (errors: InstanceType<typeof type.errors>): ResponseIssue[] =>
    errors.map((error) => ({
        path: error.propString === '' ? '(root)' : error.propString,
        code: error.code,
        expected: error.expected,
    }))

const report = (
    mode: ResponseValidationMode,
    meta: ResponseCheckMeta,
    issues: ResponseIssue[],
    now: number,
): void => {
    const key = `${meta.transport}:${meta.route}`
    const state = logState.get(key)
    if (state !== undefined && now - state.lastAt < RESPONSE_VALIDATION_LOG_WINDOW_MS) {
        state.suppressed += 1
        return
    }
    const suppressed = state?.suppressed ?? 0
    logState.set(key, { lastAt: now, suppressed: 0 })

    const entry = {
        route: meta.route,
        transport: meta.transport,
        requestId: meta.requestId,
        mode,
        issues,
        suppressed,
        // The Sentry event is sent below with its own tag, not from the log stream.
        sentrySkip: true,
    }
    const message = 'Response does not match ResponseSchema'
    if (mode === 'strict') logger.error(entry, message)
    else logger.warn(entry, message)

    sentryService.captureMessage(message, mode === 'strict' ? 'error' : 'warning', {
        requestId: meta.requestId,
        route: meta.route,
        tags: { response_validation: mode, transport: meta.transport },
        extra: { issues, suppressed },
    })
}

export const createResponseCheck = (
    schema: BaseType | undefined,
    options: ResponseCheckOptions,
): ResponseCheck | null => {
    if (options.mode === 'off' || schema === undefined) return null
    const { mode, sampleRate } = options
    const random = options.random ?? Math.random
    const now = options.now ?? Date.now

    return (payload, meta) => {
        if (mode === 'log' && sampleRate < 1 && random() >= sampleRate) return true
        const result: unknown = schema(payload)
        if (!(result instanceof type.errors)) return true
        report(mode, meta, summarize(result), now())
        return mode !== 'strict'
    }
}
