import { describe, expect, it } from 'vitest'

import { detectImageType } from './detect-image-type.js'

import { JPEG_BYTES, PNG_BYTES, WEBP_BYTES } from '../../../test-support/image-fixtures.js'

const bytes = (...values: number[]): ArrayBuffer => new Uint8Array(values).buffer
const ascii = (text: string): number[] => Array.from(Buffer.from(text, 'latin1'))

describe('detectImageType (code-issues item 46)', () => {
    it.each([
        ['png', PNG_BYTES, 'image/png'],
        ['jpeg', JPEG_BYTES, 'image/jpeg'],
        ['webp', WEBP_BYTES, 'image/webp'],
    ])('recognises %s by its signature', (_name, data, type) => {
        expect(detectImageType(data)).toBe(type)
    })

    it.each([
        ['random bytes', bytes(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)],
        ['empty', bytes()],
        ['truncated png', bytes(0x89, 0x50, 0x4e)],
        ['RIFF that is not WEBP', bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE'))],
        ['gif', bytes(...ascii('GIF89a'), 0, 0, 0, 0, 0, 0)],
        ['svg text', bytes(...ascii('<svg xmlns="'))],
    ])('returns undefined for %s', (_name, data) => {
        expect(detectImageType(data)).toBeUndefined()
    })
})
