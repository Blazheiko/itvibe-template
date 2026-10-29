// One rule for "does this HTTP response carry a body", shared by sendResponse
// and the runtime response validation so the two cannot drift apart.

/** Only null and undefined are "no payload"; false, 0 and "" are JSON data. */
export const isEmptyPayload = (payload: unknown): boolean =>
    payload === null || payload === undefined

/**
 * 3xx (incl. 304), 204 and 205 never carry a body (RFC 9110 §15.3.5, §15.3.6,
 * §15.4.5); neither does a 2xx with an empty payload (a 200 is then sent as 204).
 */
export const hasResponseBody = (status: number, payload: unknown): boolean => {
    if (status >= 300 && status < 400) return false
    if (status === 204 || status === 205) return false
    if (status >= 200 && status < 300 && isEmptyPayload(payload)) return false
    return true
}
