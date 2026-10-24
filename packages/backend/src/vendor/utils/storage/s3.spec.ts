import { afterEach, describe, expect, it, vi } from 'vitest'

const diskConfigMock = {
    s3Region: '' as string | undefined,
    s3AccessKeyId: 'key',
    s3SecretAccessKey: 'secret',
    s3Endpoint: '' as string | undefined,
    s3Bucket: 'bucket',
    s3Prefix: 'app',
    s3StaticDataPrefix: 'public',
    s3DynamicDataPrefix: 'uploads',
}

vi.mock('#config/disk.js', () => ({ default: diskConfigMock }))
vi.mock('#logger', () => ({ default: { info: vi.fn() } }))

async function loadS3() {
    vi.resetModules()
    return import('./s3.js')
}

describe('s3 object keys (code-issues item 44)', () => {
    it('buildObjectKey adds the configured prefixes', async () => {
        const s3 = await loadS3()
        expect(s3.buildObjectKey('avatars/7/a.png')).toBe('app/uploads/avatars/7/a.png')
    })

    it('deleteFromS3 deletes the prefixed key, like upload and presign', async () => {
        const { S3Client } = await import('@aws-sdk/client-s3')
        const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never)
        try {
            const s3 = await loadS3()
            await s3.deleteFromS3('avatars/7/a.png')
            const command = send.mock.calls[0]?.[0] as { input: { Bucket: string; Key: string } }
            expect(command.input).toEqual({ Bucket: 'bucket', Key: 'app/uploads/avatars/7/a.png' })
        } finally {
            send.mockRestore()
        }
    })
})

describe('s3 storage client', () => {
    afterEach(() => {
        diskConfigMock.s3Region = ''
        diskConfigMock.s3Endpoint = ''
    })

    it.each([
        ['empty', ''],
        ['blank', '   '],
        ['unset', undefined],
    ])('falls back to us-east-1 when S3_REGION is %s', async (_label, region) => {
        diskConfigMock.s3Region = region
        const s3 = await loadS3()

        const url = await s3.presignUrl('avatars/a.png', 60)

        expect(url).toContain('us-east-1')
        expect(url).toContain('app/uploads/avatars/a.png')
    })

    it('uses path-style addressing and HTTPS for a scheme-less custom endpoint', async () => {
        diskConfigMock.s3Region = 'fra1'
        diskConfigMock.s3Endpoint = 'fra1.digitaloceanspaces.com'
        const s3 = await loadS3()

        const url = await s3.presignUrl('x.txt', 60)

        expect(
            url.startsWith('https://fra1.digitaloceanspaces.com/bucket/app/uploads/x.txt?'),
        ).toBe(true)
        expect(url).toContain('fra1')
    })
})
