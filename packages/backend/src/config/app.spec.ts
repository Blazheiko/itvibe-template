import { afterEach, describe, expect, it, vi } from 'vitest'

// Real #config/app.js (no mock): each test sets the env, resets the module
// registry and imports the config again, since it is read once at import.

const NAME = 'APP_MAX_JSON_BODY_SIZE'
const DEFAULT = 2_097_152
const original = process.env[NAME]

const loadJsonLimit = async (value: string): Promise<number> => {
    process.env[NAME] = value
    vi.resetModules()
    const { default: config } = await import('./app.js')
    return config.maxJsonBodySize
}

afterEach(() => {
    if (original === undefined) delete process.env[NAME]
    else process.env[NAME] = original
})

describe('parseSize via APP_MAX_JSON_BODY_SIZE', () => {
    it('accepts a positive integer number of bytes', async () => {
        expect(await loadJsonLimit('1024')).toBe(1024)
    })

    it('ignores surrounding whitespace', async () => {
        expect(await loadJsonLimit(' 12 ')).toBe(12)
    })

    it.each(['abc', '', '0', '-1', '1.5', '1e6', 'Infinity', '9007199254740993', '0x10', '1 024'])(
        'falls back to the default for %j',
        async (value) => {
            expect(await loadJsonLimit(value)).toBe(DEFAULT)
        },
    )
})
