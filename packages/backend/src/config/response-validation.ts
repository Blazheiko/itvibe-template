import { env } from 'node:process'
import appConfig from '#config/app.js'

// Runtime check of the handler result against the route ResponseSchema
// (docs/plan/response-schema-runtime-validation.md). strict replaces an invalid
// response with a 500, log keeps it and writes a warn, off skips the check.
export const RESPONSE_VALIDATION_MODES = ['strict', 'log', 'off'] as const
export type ResponseValidationMode = (typeof RESPONSE_VALIDATION_MODES)[number]

export interface ResponseValidationConfig {
    mode: ResponseValidationMode
    /** Share of responses checked in log mode, 0..1. strict checks every response. */
    sampleRate: number
    configError: string | null
}

const readMode = (): { mode: ResponseValidationMode; error: string | null } => {
    const fallback: ResponseValidationMode = appConfig.isProductionLike ? 'off' : 'strict'
    const raw = (env['RESPONSE_VALIDATION'] ?? '').trim().toLowerCase()
    if (raw === '') return { mode: fallback, error: null }
    if ((RESPONSE_VALIDATION_MODES as readonly string[]).includes(raw)) {
        return { mode: raw as ResponseValidationMode, error: null }
    }
    return {
        mode: fallback,
        error: `RESPONSE_VALIDATION must be one of ${RESPONSE_VALIDATION_MODES.join(', ')}, got "${raw}"`,
    }
}

const readSampleRate = (): { sampleRate: number; error: string | null } => {
    const raw = (env['RESPONSE_VALIDATION_SAMPLE_RATE'] ?? '').trim()
    if (raw === '') return { sampleRate: 1, error: null }
    const value = Number(raw)
    if (!/^\d+(\.\d+)?$/.test(raw) || value > 1) {
        return {
            sampleRate: 1,
            error: `RESPONSE_VALIDATION_SAMPLE_RATE must be a number from 0 to 1, got "${raw}"`,
        }
    }
    return { sampleRate: value, error: null }
}

const readConfig = (): ResponseValidationConfig => {
    const { mode, error: modeError } = readMode()
    const { sampleRate, error: rateError } = readSampleRate()
    return { mode, sampleRate, configError: modeError ?? rateError }
}

export default Object.freeze(readConfig())
