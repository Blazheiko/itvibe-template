const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

/**
 * - `synced`: the confirmed token belongs to the user the UI shows; mutations go out.
 * - `reconciling`: a session refresh is in flight; mutations wait for it.
 * - `diverged`: the last refresh failed; a mutation first retries the refresh.
 * - `reloading`: the account changed and the page is reloading; nothing goes out
 *   and no refresh result can bring the state back.
 */
export type SessionState = 'synced' | 'reconciling' | 'diverged' | 'reloading'

interface ConfirmedToken {
    token: string
    /** Owner of the session the token belongs to; null for an anonymous session. */
    userId: string | null
}

let confirmed: ConfirmedToken | null = null
// A token from a response that does not say whose session it is (the 403 of
// csrf_guard, the 401 of auth_guard). Never sent: it only signals that the session
// may have changed under the UI, e.g. a login as another user in another tab.
let unconfirmed: string | null = null
let sessionState: SessionState = 'synced'

/**
 * The token is never embedded in the cacheable HTML shell: it arrives with the
 * app initialization response and with responses that say whose session it is.
 */
export const normalizeCsrfToken = (value: unknown): string | null =>
    typeof value === 'string' && CSRF_TOKEN_PATTERN.test(value) ? value : null

/** The token sent in X-CSRF-Token: only a confirmed one. */
export const getCsrfToken = (): string | null => confirmed?.token ?? null

export const getConfirmedUserId = (): string | null => confirmed?.userId ?? null

export const getUnconfirmedCsrfToken = (): string | null => unconfirmed

export const confirmCsrfToken = (token: unknown, userId: string | null): boolean => {
    const normalized = normalizeCsrfToken(token)
    if (normalized === null || sessionState === 'reloading') return false
    confirmed = { token: normalized, userId }
    unconfirmed = null
    return true
}

export const setUnconfirmedCsrfToken = (token: unknown): void => {
    const normalized = normalizeCsrfToken(token)
    if (normalized !== null && normalized !== confirmed?.token) {
        unconfirmed = normalized
    }
}

export const getSessionState = (): SessionState => sessionState

export const setSessionState = (state: SessionState): void => {
    // `reloading` is terminal until the page is gone.
    if (sessionState === 'reloading') return
    sessionState = state
}

/** Drops the token before a reload: nothing may be sent for the old account. */
export const enterReloading = (): void => {
    sessionState = 'reloading'
    confirmed = null
    unconfirmed = null
}
