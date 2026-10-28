import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    classifyUrl,
    countMermaidBlocks,
    deriveMarkers,
    extractIncludes,
    markdownToDist,
    resolveInternalUrl,
    srcsetUrls,
    stripInlineMarkdown,
    uncoveredPaths,
    workflowPaths,
} from './lib.mjs'

const BASE = '/vibe-template/'

describe('classifyUrl', () => {
    for (const url of [
        'https://github.com/x',
        'http://example.com',
        '//cdn.example.com/a.js',
        'mailto:a@example.com',
        'tel:+100',
        'data:image/png;base64,AAAA',
        'javascript:void(0)',
        '#section',
        '',
    ]) {
        it(`skips ${url || '(empty)'}`, () => assert.equal(classifyUrl(url), 'skip'))
    }
    for (const url of ['/vibe-template/guide/x', 'guide/x', '../a.svg', '/wrong/base']) {
        it(`treats ${url} as internal`, () => assert.equal(classifyUrl(url), 'internal'))
    }
})

describe('resolveInternalUrl', () => {
    const page = '/vibe-template/guide/smoke'

    it('resolves a local asset', () => {
        assert.deepEqual(resolveInternalUrl('/vibe-template/logo.svg', page, BASE), {
            kind: 'asset',
            file: 'logo.svg',
            hash: '',
        })
    })

    it('rejects a URL outside base', () => {
        assert.ok('error' in resolveInternalUrl('/logo.svg', page, BASE))
    })

    it('resolves a clean page URL to both cleanUrls candidates', () => {
        assert.deepEqual(resolveInternalUrl('/vibe-template/backend/config#env', page, BASE), {
            kind: 'page',
            candidates: ['backend/config.html', 'backend/config/index.html'],
            hash: 'env',
        })
    })

    it('resolves the site root and directory URLs to index.html', () => {
        assert.deepEqual(resolveInternalUrl('/vibe-template/', page, BASE).candidates, [
            'index.html',
        ])
        assert.deepEqual(resolveInternalUrl('/vibe-template/guide/', page, BASE).candidates, [
            'guide/index.html',
        ])
    })

    it('resolves relative URLs against the page and decodes Cyrillic anchors', () => {
        const result = resolveInternalUrl('./other#%D0%B7%D0%BE', page, BASE)
        assert.deepEqual(result.candidates, ['guide/other.html', 'guide/other/index.html'])
        assert.equal(result.hash, 'зо')
    })
})

describe('srcsetUrls', () => {
    it('extracts each URL', () => {
        assert.deepEqual(srcsetUrls('/a.png 1x, /b.png 2x'), ['/a.png', '/b.png'])
    })
})

describe('extractIncludes', () => {
    it('finds includes and strips region/line suffixes', () => {
        const md =
            '<!--@include: ../a.md-->\ntext\n<!-- @include: ./b.md#intro -->\n<!--@include: c.md{2-5}-->'
        assert.deepEqual(extractIncludes(md), [
            { raw: '../a.md', file: '../a.md', partial: false },
            { raw: './b.md#intro', file: './b.md', partial: true },
            { raw: 'c.md{2-5}', file: 'c.md', partial: true },
        ])
    })
})

describe('countMermaidBlocks', () => {
    it('counts mermaid fences only', () => {
        assert.equal(countMermaidBlocks('```mermaid\na\n```\n```ts\nb\n```\n~~~mermaid\nc\n~~~'), 2)
    })
})

describe('deriveMarkers', () => {
    it('takes the first heading and first plain paragraph', () => {
        const md =
            '---\ntitle: x\n---\n# Build `Scripts`\n\n```sh\n# not a heading\n```\n- item\n\nThis **directory** has [scripts](./x).\n'
        assert.deepEqual(deriveMarkers(md), {
            heading: 'Build Scripts',
            text: 'This directory has scripts.',
        })
    })
})

describe('stripInlineMarkdown', () => {
    it('removes emphasis, code, links and html', () => {
        assert.equal(stripInlineMarkdown('A *b* `c` [d](e) <br/>f'), 'A b c d f')
    })
})

describe('markdownToDist', () => {
    it('maps pages to html and URL paths', () => {
        assert.deepEqual(markdownToDist('index.md', BASE), {
            html: 'index.html',
            urlPath: '/vibe-template/',
        })
        assert.deepEqual(markdownToDist('guide/smoke.md', BASE), {
            html: 'guide/smoke.html',
            urlPath: '/vibe-template/guide/smoke',
        })
        assert.deepEqual(markdownToDist('backend/index.md', BASE), {
            html: 'backend/index.html',
            urlPath: '/vibe-template/backend/',
        })
    })
})

describe('uncoveredPaths', () => {
    const patterns = ['documentation/**', 'packages/backend/src/vendor/start/*.md', '.nvmrc']
    it('returns only files outside every glob', () => {
        assert.deepEqual(
            uncoveredPaths(
                [
                    'documentation/guide/a.md',
                    'packages/backend/src/vendor/start/SECURITY_ANALYSIS.md',
                    'packages/backend/src/vendor/start/deep/x.md',
                    'packages/backend/README.md',
                ],
                patterns,
            ),
            ['packages/backend/src/vendor/start/deep/x.md', 'packages/backend/README.md'],
        )
    })
})

describe('workflowPaths', () => {
    it('reads pull_request and push paths, tolerating missing triggers', () => {
        assert.deepEqual(
            workflowPaths({ on: { pull_request: { paths: ['a/**'] }, push: { paths: ['a/**'] } } }),
            { pr: ['a/**'], push: ['a/**'] },
        )
        assert.deepEqual(workflowPaths({ on: { workflow_dispatch: null } }), { pr: [], push: [] })
    })
})
