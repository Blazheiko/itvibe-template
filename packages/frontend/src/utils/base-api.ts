import { CsrfRejectReason } from 'shared/errors'
import { useEventBus } from './event-bus'
import { useWebSocketConnection } from '@/composables/useWebSocketConnection'
import {
    hasResponseError,
    isUnauthorizedError,
    normalizeResponseError,
} from './response-normalizer'
import type { ApiResponse, CsrfClientCode, HttpApiError } from './api-error'
import { apiPath } from './api-path'
import {
    confirmCsrfToken,
    enterReloading,
    getConfirmedUserId,
    getCsrfToken,
    getSessionState,
    normalizeCsrfToken,
    setSessionState,
    setUnconfirmedCsrfToken,
} from './csrf-token'

type HttpResponse = Record<string, unknown>

export interface HttpOptions {
    signal?: AbortSignal
    /**
     * How a 403 token_mismatch may be recovered. `public` is for auth requests an
     * anonymous visitor makes (login, register, password reset): they are repeated
     * only while the session is still anonymous. Everything else is `protected`
     * (the default): repeated only for the same user the request was made for.
     */
    csrfRecovery?: 'public' | 'protected'
    /**
     * Identity of the session after a successful response that carries no `user`:
     * `anonymous` for logout and logout-all.
     */
    sessionAfter?: 'anonymous'
}

interface ApiMethods {
    http: <T = HttpResponse>(
        method: string,
        route: string,
        body?: Record<string, unknown>,
        options?: HttpOptions,
    ) => Promise<ApiResponse<T>>
    upload: <T = HttpResponse>(
        method: string,
        route: string,
        formData: FormData,
        options?: HttpOptions,
    ) => Promise<ApiResponse<T>>
    ws: <T = HttpResponse>(route: string, body?: Record<string, unknown>) => Promise<T | null>
}

// `string & {}` keeps editor suggestions for the common methods.
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | (string & {})

const parseResponseJson = async (response: Response): Promise<unknown> => {
    try {
        return await response.json()
    } catch {
        return null
    }
}

const normalizeUrl = (url: string): string => {
    if (url.endsWith('/')) {
        return url.slice(0, -1)
    }
    return url
}
// Empty by default: requests stay same-origin (the Vite proxy in dev, the backend
// that serves the SPA in production) instead of an example domain (code-issues item 59).
const BASE_URL = normalizeUrl(import.meta.env.VITE_BASE_URL ?? '')
const INIT_ROUTE = apiPath('main/init')

const { websocketApi } = useWebSocketConnection()
const eventBus = useEventBus()
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

const isUnsafeMethod = (method: HttpMethod): boolean => UNSAFE_METHODS.has(method.toLowerCase())

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const readUserId = (payload: unknown): string | null => {
    if (!isRecord(payload) || !isRecord(payload.user)) return null
    const id = payload.user.id
    return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

// The user the UI currently shows. App.vue points it at the user store; until then
// the owner of the confirmed token stands in.
let currentUserId: () => string | null = getConfirmedUserId
export const setCurrentUserIdProvider = (provider: () => string | null): void => {
    currentUserId = provider
}

let reloadPage: () => void = () => {
    window.location.reload()
}
export const setReloadHandler = (handler: () => void): void => {
    reloadPage = handler
}

/**
 * The session changed owner under the UI. Rebuilding every store by hand would
 * miss some state of the previous user, so the page reloads; until it does,
 * nothing is sent.
 */
const onAccountChanged = (): void => {
    enterReloading()
    reloadPage()
}

type RefreshResult = { ok: true; token: string; userId: string | null } | { ok: false }

let refreshInFlight: Promise<RefreshResult> | null = null

/**
 * Asks main/init whose session the cookie holds. Silent: it emits no events and
 * redirects nowhere; the caller decides per request. Single-flight, and cleared
 * once settled (success or not) so the next action can try again.
 */
const refreshSession = (): Promise<RefreshResult> => {
    if (refreshInFlight !== null) return refreshInFlight
    setSessionState('reconciling')
    refreshInFlight = (async (): Promise<RefreshResult> => {
        try {
            const response = await fetch(`${BASE_URL}${INIT_ROUTE}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            })
            const payload = await parseResponseJson(response)
            const token = normalizeCsrfToken(isRecord(payload) ? payload.csrfToken : undefined)
            if (token === null) return { ok: false }
            if (response.status === 401) return { ok: true, token, userId: null }
            const userId = readUserId(payload)
            if (response.ok && !hasResponseError(payload) && userId !== null) {
                return { ok: true, token, userId }
            }
            return { ok: false }
        } catch {
            return { ok: false }
        }
    })()
    void refreshInFlight.then((result) => {
        if (!result.ok) setSessionState('diverged')
    })
    const settled = refreshInFlight
    void settled.finally(() => {
        if (refreshInFlight === settled) refreshInFlight = null
    })
    return settled
}

type Decision =
    | { kind: 'send'; token: string }
    | { kind: 'reject'; clientCode: CsrfClientCode }
    | { kind: 'unauthorized' }

/** What a refreshed session allows for a request made while the UI showed `expectedUserId`. */
const decide = (
    result: RefreshResult,
    expectedUserId: string | null,
    recovery: 'public' | 'protected',
): Decision => {
    if (getSessionState() === 'reloading') {
        return { kind: 'reject', clientCode: 'account_changed' }
    }
    if (!result.ok) return { kind: 'reject', clientCode: 'session_unverified' }

    // A protected request needs a signed-in session; a public one runs in whatever
    // session the UI shows (anonymous for login, signed in for verify-email).
    // Either way the session must still belong to the user the request was made for.
    if (recovery === 'protected' && result.userId === null) {
        confirmCsrfToken(result.token, null)
        setSessionState('synced')
        return { kind: 'unauthorized' }
    }
    if (result.userId === expectedUserId) {
        return confirmAndSend(result)
    }
    onAccountChanged()
    return { kind: 'reject', clientCode: 'account_changed' }
}

const confirmAndSend = (result: { token: string; userId: string | null }): Decision => {
    confirmCsrfToken(result.token, result.userId)
    setSessionState('synced')
    return { kind: 'send', token: result.token }
}

/**
 * Gate for unsafe requests: the token they would send must belong to the user the
 * UI shows. Returns the token to send (or null when there is none yet), or why
 * the request must not go out.
 */
const gate = async (
    expectedUserId: string | null,
    recovery: 'public' | 'protected',
): Promise<Decision | { kind: 'send'; token: string | null }> => {
    const state = getSessionState()
    if (state === 'reloading') return { kind: 'reject', clientCode: 'account_changed' }
    if (state === 'synced') return { kind: 'send', token: getCsrfToken() }
    // reconciling waits for the refresh in flight; diverged starts a new one.
    return decide(await refreshSession(), expectedUserId, recovery)
}

const localError = (clientCode: CsrfClientCode): HttpApiError => ({
    clientCode,
    transportCode: 0,
    message:
        clientCode === 'account_changed'
            ? 'The account changed in another tab'
            : 'Could not verify the session. Please try again.',
})

type SendResult<T> =
    | { response: ApiResponse<T>; tokenMismatch: false }
    | { response: { data: T | null; error: HttpApiError }; tokenMismatch: true }

const send = async <T>(
    method: HttpMethod,
    route: string,
    buildInit: (headers: Record<string, string>) => RequestInit,
    token: string | null,
    options: HttpOptions,
    networkMessage: string,
): Promise<SendResult<T>> => {
    const headers: Record<string, string> = {}
    if (isUnsafeMethod(method) && token !== null) {
        headers['X-CSRF-Token'] = token
    }
    // Owner of the token sent: a 2xx proves the session is still theirs.
    const sentFor = token !== null && token === getCsrfToken() ? getConfirmedUserId() : undefined

    try {
        const response = await fetch(`${BASE_URL}${route}`, buildInit(headers))
        const responseData = await parseResponseJson(response)
        const failed = !response.ok || hasResponseError(responseData)
        const csrfToken = isRecord(responseData) ? responseData.csrfToken : undefined

        if (route === INIT_ROUTE && method.toUpperCase() === 'GET') {
            // init says whose session it is: 401 → anonymous, 200 → its user.
            if (response.status === 401) {
                confirmCsrfToken(csrfToken, null)
            } else if (!failed && readUserId(responseData) !== null) {
                confirmCsrfToken(csrfToken, readUserId(responseData))
            }
        } else if (!failed) {
            const userId = readUserId(responseData)
            if (userId !== null) {
                confirmCsrfToken(csrfToken, userId)
            } else if (options.sessionAfter === 'anonymous') {
                confirmCsrfToken(csrfToken, null)
            } else if (sentFor !== undefined) {
                confirmCsrfToken(csrfToken, sentFor)
            } else {
                setUnconfirmedCsrfToken(csrfToken)
            }
        } else {
            setUnconfirmedCsrfToken(csrfToken)
        }

        const fallbackMessage =
            response.status === 422
                ? 'Validation Error'
                : response.status === 401
                  ? 'Unauthorized'
                  : `HTTP error! status: ${response.status}`

        if (failed) {
            const normalizedError = normalizeResponseError(
                responseData,
                fallbackMessage,
                response.status,
            )
            const tokenMismatch =
                normalizedError.code === 'csrf_invalid' &&
                isRecord(responseData) &&
                responseData.reason === CsrfRejectReason.TokenMismatch

            if (isUnauthorizedError(responseData, normalizedError.transportCode)) {
                eventBus.emit('unauthorized')
            }

            const failure = {
                data: responseData as T,
                error: {
                    code: normalizedError.code,
                    transportCode: normalizedError.transportCode,
                    message: normalizedError.message,
                },
            }
            return tokenMismatch
                ? { response: failure, tokenMismatch: true }
                : { response: failure, tokenMismatch: false }
        }

        return { response: { data: responseData as T, error: null }, tokenMismatch: false }
    } catch (error: unknown) {
        console.error('Network error:', error)
        return {
            response: {
                data: null,
                error: {
                    transportCode: 0,
                    message: error instanceof Error ? error.message : networkMessage,
                },
            },
            tokenMismatch: false,
        }
    }
}

/**
 * Sends a request; an unsafe one passes the session gate first and, on a 403
 * token_mismatch, is repeated at most once with the token of a refreshed session
 * that still belongs to the same user. origin_mismatch and fetch_site_* are never
 * repeated: a fresh token cannot fix them.
 */
const request = async <T>(
    method: HttpMethod,
    route: string,
    buildInit: (headers: Record<string, string>) => RequestInit,
    options: HttpOptions,
    networkMessage: string,
): Promise<ApiResponse<T>> => {
    if (!isUnsafeMethod(method)) {
        return (await send<T>(method, route, buildInit, null, options, networkMessage)).response
    }

    const recovery = options.csrfRecovery ?? 'protected'
    const expectedUserId = currentUserId()

    const admission = await gate(expectedUserId, recovery)
    if (admission.kind === 'reject') {
        return { data: null, error: localError(admission.clientCode) }
    }
    if (admission.kind === 'unauthorized') {
        eventBus.emit('unauthorized')
        return {
            data: null,
            error: { code: 'unauthorized', transportCode: 0, message: 'Unauthorized' },
        }
    }

    const first = await send<T>(method, route, buildInit, admission.token, options, networkMessage)
    if (!first.tokenMismatch) return first.response

    const decision = decide(await refreshSession(), expectedUserId, recovery)
    if (decision.kind === 'reject') {
        return {
            data: first.response.data,
            error: { ...first.response.error, clientCode: decision.clientCode },
        }
    }
    if (decision.kind === 'unauthorized') {
        eventBus.emit('unauthorized')
        return first.response
    }

    return (await send<T>(method, route, buildInit, decision.token, options, networkMessage))
        .response
}

const api: ApiMethods = {
    http: async <T = HttpResponse>(
        method: HttpMethod,
        route: string,
        body: Record<string, unknown> = {},
        options: HttpOptions = {},
    ): Promise<ApiResponse<T>> => {
        const hasBody = method.toLowerCase() !== 'get' && method.toLowerCase() !== 'delete'
        return request<T>(
            method,
            route,
            (headers) => ({
                method,
                headers: { 'Content-Type': 'application/json', ...headers },
                ...(hasBody ? { body: JSON.stringify(body) } : {}),
                signal: options.signal ?? null,
                credentials: 'include',
            }),
            options,
            'Network error. Please try again later.',
        )
    },

    upload: async <T = HttpResponse>(
        method: HttpMethod,
        route: string,
        formData: FormData,
        options: HttpOptions = {},
    ): Promise<ApiResponse<T>> => {
        // The same FormData is sent again on a retry; the browser sets the
        // multipart Content-Type itself.
        return request<T>(
            method,
            route,
            (headers) => ({
                method,
                headers,
                body: formData,
                signal: options.signal ?? null,
                credentials: 'include',
            }),
            options,
            'Upload failed. Please try again later.',
        )
    },

    ws: async <T = HttpResponse>(
        route: string,
        body: Record<string, unknown> = {},
    ): Promise<T | null> => {
        try {
            // console.log('websocketApi ws route', route)
            // console.log('websocketApi ws body', body)
            const result = await websocketApi(route, body)
            console.log({ result })
            return result as unknown as T
        } catch (e) {
            console.error(e)
            return null
        }
    },
}

export default api
