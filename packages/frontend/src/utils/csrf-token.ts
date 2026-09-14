const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

let csrfToken: string | null = null

const normalizeToken = (value: unknown): string | null => {
    if (typeof value !== 'string' || !CSRF_TOKEN_PATTERN.test(value)) {
        return null
    }
    return value
}

/**
 * The token is never embedded in the cacheable HTML shell: it arrives with the
 * app initialization response and is refreshed from every response that rotates it.
 */
export const getCsrfToken = (): string | null => csrfToken

export const setCsrfToken = (token: unknown): void => {
    const normalized = normalizeToken(token)
    if (normalized !== null) {
        csrfToken = normalized
    }
}

export const updateCsrfTokenFromResponse = (payload: unknown): boolean => {
    if (payload !== null && typeof payload === 'object' && 'csrfToken' in payload) {
        const normalized = normalizeToken((payload as { csrfToken?: unknown }).csrfToken)
        if (normalized !== null) {
            csrfToken = normalized
            return true
        }
    }

    return false
}
