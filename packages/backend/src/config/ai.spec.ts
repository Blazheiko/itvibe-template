import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
    vi.resetModules()
    for (const key of Object.keys(process.env)) {
        if (!(key in ORIGINAL_ENV)) delete process.env[key]
    }
    Object.assign(process.env, ORIGINAL_ENV)
})

const load = async () => (await import('./ai.js')).default

describe('AI config (code-issues items 50, 51)', () => {
    it.each([['openai'], ['xai'], ['mistral']])('accepts AI_TEXT_DRIVER=%s', async (driver) => {
        process.env['AI_TEXT_DRIVER'] = driver
        const config = await load()
        expect(config.drivers.text).toBe(driver)
        expect(config.configError).toBeNull()
    })

    it('defaults to openai and a 60 s timeout', async () => {
        delete process.env['AI_TEXT_DRIVER']
        delete process.env['AI_REQUEST_TIMEOUT_MS']
        const config = await load()
        expect(config.drivers.text).toBe('openai')
        expect(config.requestTimeoutMs).toBe(60_000)
        expect(config.configError).toBeNull()
    })

    it('reports an unknown AI_TEXT_DRIVER instead of falling back to Mistral', async () => {
        process.env['AI_TEXT_DRIVER'] = 'openia'
        const config = await load()
        expect(config.configError).toContain('AI_TEXT_DRIVER must be one of openai, xai, mistral')
    })

    it.each([['abc'], ['999'], ['-5'], ['1.5']])(
        'reports AI_REQUEST_TIMEOUT_MS=%s',
        async (value) => {
            process.env['AI_REQUEST_TIMEOUT_MS'] = value
            const config = await load()
            expect(config.configError).toContain('AI_REQUEST_TIMEOUT_MS')
        },
    )

    it('reads AI_REQUEST_TIMEOUT_MS', async () => {
        process.env['AI_REQUEST_TIMEOUT_MS'] = '15000'
        expect((await load()).requestTimeoutMs).toBe(15_000)
    })
})

describe('validateRuntimeConfig and AI config', () => {
    it('stops the start on an unknown AI_TEXT_DRIVER', async () => {
        process.env['AI_TEXT_DRIVER'] = 'foo'
        const { validateRuntimeConfig } = await import('#app/start/validate-runtime-config.js')
        expect(() => {
            validateRuntimeConfig()
        }).toThrow(/Invalid AI configuration: AI_TEXT_DRIVER/)
    })
})
