import { Result } from 'better-result'
import type { AppError, AppResult } from './errors.js'
import { internal, serviceUnavailable } from './errors.js'
import { RedisUnavailableError } from '#vendor/utils/network/errors/redis-unavailable-error.js'

/** Redis being down is not a server bug: 503 + Retry-After instead of 500. */
export function toInternalError(cause: unknown, publicMessage = 'Internal error'): AppError {
    if (cause instanceof RedisUnavailableError) return serviceUnavailable(cause)
    return internal(cause, publicMessage)
}

export function tryInternal<T>(fn: () => Promise<T>, publicMessage: string): Promise<AppResult<T>> {
    return Result.tryPromise({
        try: fn,
        catch: (cause) => toInternalError(cause, publicMessage),
    })
}

export function tryDomain<T, E extends AppError>(
    fn: () => Promise<T>,
    mapError: (cause: unknown) => E,
): Promise<Result<T, E>> {
    return Result.tryPromise({
        try: fn,
        catch: mapError,
    })
}
