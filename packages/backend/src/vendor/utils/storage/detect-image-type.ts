// Image type from the file's own bytes (magic numbers), not from the multipart
// Content-Type the client sent (code-issues item 46). Only the formats the app
// accepts for uploads are recognised.
export type DetectedImageType = 'image/jpeg' | 'image/png' | 'image/webp'

const startsWith = (data: Uint8Array, signature: readonly number[], offset = 0): boolean =>
    data.length >= offset + signature.length &&
    signature.every((byte, index) => data[offset + index] === byte)

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const
const JPEG = [0xff, 0xd8, 0xff] as const
const RIFF = [0x52, 0x49, 0x46, 0x46] as const // "RIFF"
const WEBP = [0x57, 0x45, 0x42, 0x50] as const // "WEBP" at offset 8

export function detectImageType(data: ArrayBuffer | Uint8Array): DetectedImageType | undefined {
    const view = data instanceof Uint8Array ? data : new Uint8Array(data)
    if (startsWith(view, PNG)) return 'image/png'
    if (startsWith(view, JPEG)) return 'image/jpeg'
    if (startsWith(view, RIFF) && startsWith(view, WEBP, 8)) return 'image/webp'
    return undefined
}

export const IMAGE_EXTENSIONS: Readonly<Record<DetectedImageType, string>> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}
