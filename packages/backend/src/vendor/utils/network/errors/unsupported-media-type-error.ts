import type { BodyKind } from '../http-request-handlers.js'

export class UnsupportedMediaTypeError extends Error {
    readonly name = 'UnsupportedMediaTypeError'
    readonly code = 'unsupported_media_type'
    readonly statusCode = 415

    constructor(
        // null: the request has a body but no Content-Type header.
        public readonly receivedContentType: string | null,
        public readonly allowedKinds: BodyKind[],
    ) {
        super(
            receivedContentType === null
                ? `Missing Content-Type. Allowed: ${allowedKinds.join(', ')}`
                : `Unsupported Content-Type "${receivedContentType}". Allowed: ${allowedKinds.join(', ')}`,
        )
    }
}
