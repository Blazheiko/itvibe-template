import { mkdtempSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// H-3 in docs/security/security-analysis-status.md: static files are served only
// for allowed extensions, and unsafe URLs are refused with 400.

vi.mock('#config/app.js', () => ({
    default: {
        env: 'manual-test',
        serveStatic: true,
        staticMaxMemoryFileSize: 1_048_576,
        staticMaxMemoryTotal: 67_108_864,
    },
}))

// The static root is resolved from cwd at import. Point it at a private temp dir, so
// walking it does not race with other specs that write into the shared public-test.
const ROOT = mkdtempSync(path.join(os.tmpdir(), 'h3-static-'))
const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(ROOT)
const { cacheStaticSource, staticHandler } = await import('./static-server.js')
cwdSpy.mockRestore()

const FIXTURE_DIR = 'h3-static-fixture'
const FIXTURE_PATH = path.join(ROOT, './public-test', FIXTURE_DIR)

const ALLOWED = ['app.js', 'style.css', 'logo.svg']
const REFUSED = ['secrets.env', 'server.ts', 'dump.sql', 'app.js.map', 'backup.tar.gz', 'noext']

interface Captured {
    status: string
}

const fallback = async (url: string): Promise<Captured> => {
    const captured: Captured = { status: '' }
    const res = {
        cork: (callback: () => void): void => {
            callback()
        },
        writeStatus: (status: string): void => {
            captured.status = status
        },
        writeHeader: (): void => {},
        end: (): void => {},
    }
    const req = { getUrl: () => url, getHeader: () => '' }
    await staticHandler(res as never, req as never)
    return captured
}

describe('H-3: static extension allowlist', () => {
    let cachedKeys: string[] = []

    beforeAll(async () => {
        await fs.mkdir(FIXTURE_PATH, { recursive: true })
        for (const name of [...ALLOWED, ...REFUSED, '.hidden.js']) {
            await fs.writeFile(path.join(FIXTURE_PATH, name), 'x', 'utf8')
        }
        const cache = await cacheStaticSource()
        cachedKeys = [...(cache?.keys() ?? [])]
    })

    afterAll(async () => {
        await fs.rm(ROOT, { recursive: true, force: true })
    })

    it.each(ALLOWED)('caches %s', (name) => {
        expect(cachedKeys).toContain(`/${FIXTURE_DIR}/${name}`)
    })

    it.each([...REFUSED, '.hidden.js'])('does not cache %s', (name) => {
        expect(cachedKeys).not.toContain(`/${FIXTURE_DIR}/${name}`)
    })

    it.each(REFUSED.filter((name) => name.includes('.')))(
        'answers 404 for %s through the fallback handler',
        async (name) => {
            expect((await fallback(`/${FIXTURE_DIR}/${name}`)).status).toBe('404 Not Found')
        },
    )
})

describe('H-3: unsafe static URLs', () => {
    it.each([
        '/../etc/passwd',
        '/assets/../../.env',
        '/%2e%2e/etc/passwd',
        '/%2E%2E/etc/passwd',
        '/index.html%00.js',
        '/index.html\0.js',
    ])('answers 400 for %j', async (url) => {
        expect((await fallback(url)).status).toBe('400 Bad Request')
    })
})
