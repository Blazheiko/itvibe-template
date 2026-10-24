// Minimal file headers for upload tests: enough bytes for detectImageType.
const ascii = (text: string): number[] => Array.from(Buffer.from(text, 'latin1'))
const bytes = (...values: number[]): ArrayBuffer => new Uint8Array(values).buffer

export const PNG_BYTES = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13)
export const JPEG_BYTES = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 16, ...ascii('JFIF'))
export const WEBP_BYTES = bytes(...ascii('RIFF'), 0x24, 0, 0, 0, ...ascii('WEBPVP8 '))
export const NOT_AN_IMAGE = bytes(...ascii('MZ'), 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0)
