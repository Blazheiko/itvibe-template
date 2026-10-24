import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
    vi.resetModules()
    for (const key of Object.keys(process.env)) {
        if (!(key in ORIGINAL_ENV)) delete process.env[key]
    }
    Object.assign(process.env, ORIGINAL_ENV)
})

const load = async () => (await import('./logging.js')).default

describe('LOG_LEVEL (code-issues item 34)', () => {
    it('defaults to info', async () => {
        delete process.env['LOG_LEVEL']
        expect(await load()).toEqual({ level: 'info', configError: null })
    })

    it.each([['debug'], ['TRACE'], [' warn '], ['silent']])('accepts %j', async (value) => {
        process.env['LOG_LEVEL'] = value
        const config = await load()
        expect(config.level).toBe(value.trim().toLowerCase())
        expect(config.configError).toBeNull()
    })

    it('reports an unknown level and keeps info for the logger', async () => {
        process.env['LOG_LEVEL'] = 'verbose'
        const config = await load()
        expect(config.level).toBe('info')
        expect(config.configError).toContain('LOG_LEVEL must be one of')
    })

    it('stops the start through validateRuntimeConfig', async () => {
        process.env['LOG_LEVEL'] = 'verbose'
        const { validateRuntimeConfig } = await import('#app/start/validate-runtime-config.js')
        expect(() => {
            validateRuntimeConfig()
        }).toThrow(/Invalid logging configuration: LOG_LEVEL/)
    })

    it('the logger uses the configured level', async () => {
        process.env['LOG_LEVEL'] = 'debug'
        const { default: logger } = await import('#vendor/utils/logger.js')
        expect(logger.level).toBe('debug')
        expect(logger.isLevelEnabled('debug')).toBe(true)
    })
})
