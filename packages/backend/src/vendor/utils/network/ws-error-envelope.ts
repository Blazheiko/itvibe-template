import type { ErrorResponse, WsResponseData } from '#vendor/types/types.js'

// One shape for every WS transport error (feat-048): status 'error', data null and the
// envelope in `error`. Business errors of controllers and middleware travel in `data`
// instead, as the route ResponseSchema describes them.

export const createWsErrorEnvelope = (
    code: string,
    message: string,
    options?: { reason?: string; details?: unknown },
): ErrorResponse => ({
    code,
    message,
    ...(options?.reason !== undefined ? { reason: options.reason } : {}),
    ...(options?.details !== undefined ? { details: options.details } : {}),
})

/** Turns a response into a transport error; drops whatever `data` the handler wrote. */
export const setWsError = (responseData: WsResponseData, envelope: ErrorResponse): void => {
    responseData.status = 'error'
    responseData.data = null
    responseData.error = envelope
}
