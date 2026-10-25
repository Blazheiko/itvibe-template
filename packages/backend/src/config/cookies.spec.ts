import { afterEach, describe, expect, it, vi } from 'vitest'

// H-4 in docs/security/security-analysis-status.md: the default cookie must not be
// SameSite=None, and stays httpOnly and Secure outside local.

const load = async (appEnv: string) => {
    vi.resetModules()
    vi.stubEnv('APP_ENV', appEnv)
    return (await import('./cookies.js')).default.default
}

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('H-4: default cookie options', () => {
    it.each(['production', 'manual-test', 'local'])(
        'uses SameSite=Lax and httpOnly in %s',
        async (env) => {
            const cookie = await load(env)
            expect(cookie.sameSite).toBe('Lax')
            expect(cookie.httpOnly).toBe(true)
        },
    )

    it('is Secure outside local', async () => {
        expect((await load('production')).secure).toBe(true)
    })
})
