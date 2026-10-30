import { env } from 'node:process'
import appConfig from '#config/app.js'

// Reaction to a broken response contract (docs/plan/strip-response-fields-plan.md §4.2).
// A schema mismatch is a 500 in both modes; undeclared keys are a 500 in strict and are
// stripped with a warn in log. The schema runs on every response: there is no off mode.
export const RESPONSE_VALIDATION_CONTRACT_MODES = ['strict', 'log'] as const
export type ResponseValidationMode = (typeof RESPONSE_VALIDATION_CONTRACT_MODES)[number]

export interface ResponseValidationConfig {
    mode: ResponseValidationMode
    configError: string | null
    /** Start-up warnings about the legacy RESPONSE_VALIDATION variables (§4.4). */
    warnings: string[]
}

const isMode = (value: string): value is ResponseValidationMode =>
    (RESPONSE_VALIDATION_CONTRACT_MODES as readonly string[]).includes(value)

const read = (name: string): string => (env[name] ?? '').trim().toLowerCase()

const readConfig = (): ResponseValidationConfig => {
    const fallback: ResponseValidationMode = appConfig.isProductionLike ? 'log' : 'strict'
    const warnings: string[] = []
    const current = read('RESPONSE_VALIDATION_CONTRACT')
    const legacy = read('RESPONSE_VALIDATION')

    if (env['RESPONSE_VALIDATION_SAMPLE_RATE'] !== undefined) {
        warnings.push(
            'RESPONSE_VALIDATION_SAMPLE_RATE is ignored: every response is checked; remove it',
        )
    }

    if (current !== '') {
        if (legacy !== '') {
            warnings.push(
                'Both RESPONSE_VALIDATION_CONTRACT and RESPONSE_VALIDATION are set; ' +
                    'RESPONSE_VALIDATION_CONTRACT wins, remove RESPONSE_VALIDATION',
            )
        }
        if (isMode(current)) return { mode: current, configError: null, warnings }
        return {
            mode: fallback,
            configError: `RESPONSE_VALIDATION_CONTRACT must be one of ${RESPONSE_VALIDATION_CONTRACT_MODES.join(', ')}, got "${current}"`,
            warnings,
        }
    }

    if (legacy === '') return { mode: fallback, configError: null, warnings }
    if (isMode(legacy)) {
        warnings.push('RESPONSE_VALIDATION is renamed to RESPONSE_VALIDATION_CONTRACT')
        return { mode: legacy, configError: null, warnings }
    }
    if (legacy === 'off') {
        warnings.push(
            'RESPONSE_VALIDATION=off is gone: using log; set RESPONSE_VALIDATION_CONTRACT instead',
        )
        return { mode: 'log', configError: null, warnings }
    }
    return {
        mode: fallback,
        configError: `RESPONSE_VALIDATION must be one of strict, log, off, got "${legacy}"`,
        warnings,
    }
}

export default Object.freeze(readConfig())
