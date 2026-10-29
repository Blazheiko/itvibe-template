import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
    vi.resetModules()
    for (const key of Object.keys(process.env)) {
        if (!(key in ORIGINAL_ENV)) delete process.env[key]
    }
    Object.assign(process.env, ORIGINAL_ENV)
})

const load = async () => (await import('./response-validation.js')).default

const setEnv = (values: Record<string, string | undefined>): void => {
    for (const [key, value] of Object.entries(values)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
    }
}

describe('RESPONSE_VALIDATION', () => {
    it('defaults to strict outside production', async () => {
        setEnv({
            RESPONSE_VALIDATION: undefined,
            APP_IS_PRODUCTION: 'false',
            RESPONSE_VALIDATION_SAMPLE_RATE: undefined,
        })
        expect(await load()).toEqual({ mode: 'strict', sampleRate: 1, configError: null })
    })

    it('defaults to off in production', async () => {
        setEnv({ RESPONSE_VALIDATION: undefined, APP_IS_PRODUCTION: 'true' })
        expect((await load()).mode).toBe('off')
    })

    it.each([['strict'], ['LOG'], [' off ']])('accepts %j', async (value) => {
        setEnv({ RESPONSE_VALIDATION: value })
        const config = await load()
        expect(config.mode).toBe(value.trim().toLowerCase())
        expect(config.configError).toBeNull()
    })

    it('reports an unknown mode instead of falling back silently', async () => {
        setEnv({ RESPONSE_VALIDATION: 'warn' })
        expect((await load()).configError).toContain('RESPONSE_VALIDATION must be one of')
    })

    it.each([['0'], ['0.25'], ['1'], ['1.0']])('accepts sample rate %j', async (value) => {
        setEnv({ RESPONSE_VALIDATION_SAMPLE_RATE: value })
        const config = await load()
        expect(config.sampleRate).toBe(Number(value))
        expect(config.configError).toBeNull()
    })

    it.each([['-0.1'], ['1.5'], ['abc'], ['1e-1'], ['Infinity']])(
        'reports an invalid sample rate %j',
        async (value) => {
            setEnv({ RESPONSE_VALIDATION_SAMPLE_RATE: value })
            const config = await load()
            expect(config.sampleRate).toBe(1)
            expect(config.configError).toContain('RESPONSE_VALIDATION_SAMPLE_RATE')
        },
    )

    it('stops the start through validateRuntimeConfig', async () => {
        setEnv({ RESPONSE_VALIDATION: 'warn' })
        const { validateRuntimeConfig } = await import('#app/start/validate-runtime-config.js')
        expect(() => {
            validateRuntimeConfig()
        }).toThrow(/Invalid response validation configuration: RESPONSE_VALIDATION/)
    })
})
