import { type } from '@arktype/type'
import { ErrorCodeSchema } from './error-code-schema.js'
import type { ErrorDetails } from '../errors/error-codes.js'

export const BaseResponseSchema = type({
    status: 'string',
})
export type BaseResponse = typeof BaseResponseSchema.infer

export const CanonicalErrorResponseSchema = type({
    status: "'error'",
    code: ErrorCodeSchema,
    message: 'string',
    'reason?': 'string',
    'details?': 'unknown',
    /** Session CSRF token, attached to responses of cookie-backed routes. */
    'csrfToken?': 'string',
})

// The schema checks `code`; `details` keeps its precise TypeScript union, which a runtime
// schema cannot express without duplicating every details shape.
export type CanonicalErrorResponse = Omit<typeof CanonicalErrorResponseSchema.infer, 'details'> & {
    details?: ErrorDetails
}

/**
 * Swaps the error branch of a type inferred from `type.or(..., CanonicalErrorResponseSchema)`
 * for `CanonicalErrorResponse`, so `details` keeps its `ErrorDetails` union instead of `unknown`.
 */
export type WithCanonicalError<T> = Exclude<T, { status: 'error' }> | CanonicalErrorResponse

export const ErrorResponseSchema = CanonicalErrorResponseSchema
export type ErrorResponse = typeof ErrorResponseSchema.infer
export type AppErrorResponse = CanonicalErrorResponse

export const SuccessResponseSchema = type({
    status: "'ok'",
    'data?': 'unknown',
})
export type SuccessResponse = typeof SuccessResponseSchema.infer
