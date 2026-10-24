import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
    vi.resetModules()
    for (const key of Object.keys(process.env)) {
        if (!(key in ORIGINAL_ENV)) delete process.env[key]
    }
    Object.assign(process.env, ORIGINAL_ENV)
})

const load = async () => (await import('./support.js')).default

describe('Support AI config (code-issues items 52, 54)', () => {
    it('has defaults: en, batches of 50, max distance 0.8', async () => {
        delete process.env['SUPPORT_DEFAULT_LANGUAGE']
        delete process.env['SUPPORT_EMBEDDING_BATCH_SIZE']
        delete process.env['SUPPORT_SEARCH_MAX_DISTANCE']
        const config = await load()
        expect(config.defaultLanguage).toBe('en')
        expect(config.embeddingBatchSize).toBe(50)
        expect(config.searchMaxDistance).toBe(0.8)
        expect(config.configError).toBeNull()
    })

    it('reads valid values', async () => {
        process.env['SUPPORT_DEFAULT_LANGUAGE'] = 'uk'
        process.env['SUPPORT_EMBEDDING_BATCH_SIZE'] = '10'
        process.env['SUPPORT_SEARCH_MAX_DISTANCE'] = '0.45'
        const config = await load()
        expect(config).toMatchObject({
            defaultLanguage: 'uk',
            embeddingBatchSize: 10,
            searchMaxDistance: 0.45,
            configError: null,
        })
    })

    it.each([
        ['SUPPORT_DEFAULT_LANGUAGE', 'klingon'],
        ['SUPPORT_EMBEDDING_BATCH_SIZE', '0'],
        ['SUPPORT_EMBEDDING_BATCH_SIZE', '5000'],
        ['SUPPORT_SEARCH_MAX_DISTANCE', '3'],
        ['SUPPORT_SEARCH_MAX_DISTANCE', 'far'],
    ])('reports %s=%s', async (name, value) => {
        process.env[name] = value
        expect((await load()).configError).toContain(name)
    })
})
