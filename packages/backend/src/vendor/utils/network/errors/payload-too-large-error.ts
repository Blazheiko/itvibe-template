export class PayloadTooLargeError extends Error {
    readonly name = 'PayloadTooLargeError';
    readonly code = 'payload_too_large';
    readonly statusCode = 413;

    constructor(
        public readonly limit: number,
        public readonly contentType: string,
    ) {
        super(`Payload exceeds limit ${String(limit)} bytes for ${contentType}`);
    }
}
