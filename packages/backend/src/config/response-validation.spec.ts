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

const clean = { RESPONSE_VALIDATION_CONTRACT: undefined }

describe('RESPONSE_VALIDATION_CONTRACT', () => {
    it('defaults to strict outside production', async () => {
        setEnv({ ...clean, APP_IS_PRODUCTION: 'false' })
        expect(await load()).toEqual({ mode: 'strict', configError: null })
    })

    it('defaults to log in production', async () => {
        setEnv({ ...clean, APP_IS_PRODUCTION: 'true' })
        expect((await load()).mode).toBe('log')
    })

    it.each([['strict'], ['LOG'], [' log ']])('accepts %j', async (value) => {
        setEnv({ ...clean, RESPONSE_VALIDATION_CONTRACT: value })
        const config = await load()
        expect(config.mode).toBe(value.trim().toLowerCase())
        expect(config.configError).toBeNull()
    })

    it.each([['off'], ['warn']])('reports %j as an unknown mode', async (value) => {
        setEnv({ ...clean, RESPONSE_VALIDATION_CONTRACT: value })
        expect((await load()).configError).toContain('RESPONSE_VALIDATION_CONTRACT must be one of')
    })

    it('stops the start through validateRuntimeConfig', async () => {
        setEnv({ ...clean, RESPONSE_VALIDATION_CONTRACT: 'warn' })
        const { validateRuntimeConfig } = await import('#app/start/validate-runtime-config.js')
        expect(() => {
            validateRuntimeConfig()
        }).toThrow(/Invalid response validation configuration: RESPONSE_VALIDATION_CONTRACT/)
    })

    it('ignores the removed RESPONSE_VALIDATION variable', async () => {
        setEnv({ ...clean, APP_IS_PRODUCTION: 'false', RESPONSE_VALIDATION: 'off' })
        expect(await load()).toEqual({ mode: 'strict', configError: null })
    })
})
