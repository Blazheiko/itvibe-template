import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Import rules of the layered architecture (documentation/backend/architecture.md,
// code-issues items 22, 24). Static check of the sources, no modules are loaded.
const appDir = fileURLToPath(new URL('.', import.meta.url))

const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) return sourceFiles(path)
        return entry.name.endsWith('.ts') && !/\.(spec|test)\.ts$/.test(entry.name) ? [path] : []
    })

const files = sourceFiles(appDir).map((path) => ({
    path: relative(appDir, path),
    source: readFileSync(path, 'utf8'),
}))
const importsOf = (source: string): string[] =>
    [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1] ?? '')

const offenders = (
    inDir: (path: string) => boolean,
    forbidden: (specifier: string) => boolean,
): string[] =>
    files
        .filter((file) => inDir(file.path))
        .flatMap((file) =>
            importsOf(file.source)
                .filter(forbidden)
                .map((specifier) => `${file.path} -> ${specifier}`),
        )

describe('layering', () => {
    it('controllers, middlewares and websocket do not import repositories', () => {
        expect(
            offenders(
                (path) => /^(controllers|middlewares|websocket)\//.test(path),
                (specifier) => specifier.startsWith('#app/repositories'),
            ),
        ).toEqual([])
    })

    it('outside app/repositories, repositories are imported through the barrel', () => {
        expect(
            offenders(
                (path) => !path.startsWith('repositories/'),
                (specifier) => /^#app\/repositories\/.+-repository\.js$/.test(specifier),
            ),
        ).toEqual([])
    })

    it('every repository module is exported by the barrel', () => {
        const barrel = files.find((file) => file.path === 'repositories/index.ts')?.source ?? ''
        const modules = files
            .filter((file) => /^repositories\/.+-repository\.ts$/.test(file.path))
            .map((file) => `./${file.path.replace(/^repositories\//, '').replace(/\.ts$/, '.js')}`)
        expect(modules.filter((module) => !barrel.includes(`'${module}'`))).toEqual([])
    })

    it('repositories do not log', () => {
        expect(
            offenders(
                (path) => path.startsWith('repositories/'),
                (specifier) => specifier === '#logger' || specifier.endsWith('/logger.js'),
            ),
        ).toEqual([])
    })

    it('services do not query the database directly', () => {
        expect(
            offenders(
                (path) => path.startsWith('services/'),
                (specifier) =>
                    specifier === '#database/db.js' || specifier === '#database/schema.js',
            ),
        ).toEqual([])
    })
})
