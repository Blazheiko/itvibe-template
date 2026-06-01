const CSRF_META_SELECTOR = 'meta[name="csrf-token"]'
const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

let csrfToken: string | null = null

const normalizeToken = (value: unknown): string | null => {
    if (typeof value !== 'string' || !CSRF_TOKEN_PATTERN.test(value)) {
        return null
    }
    return value
}

export const readCsrfTokenFromMeta = (): string | null => {
    const token = document.querySelector<HTMLMetaElement>(CSRF_META_SELECTOR)?.content ?? null
    return normalizeToken(token)
}

export const getCsrfToken = (): string | null => {
    csrfToken ??= readCsrfTokenFromMeta()
    return csrfToken
}

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
