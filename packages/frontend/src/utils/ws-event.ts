// WS request events are `<API_PATH_PREFIX>/<route>`, the same keys the server
// builds for its WS routes, so the frontend must use the backend's prefix
// (code-issues item 17). Set VITE_API_PATH_PREFIX when the backend runs with a
// non-default API_PATH_PREFIX.
export const normalizeApiPrefix = (raw: string | undefined): string => {
    const trimmed = (raw ?? '').trim().replace(/^\/+|\/+$/g, '')
    return trimmed === '' ? 'api' : trimmed
}

export const WS_API_PREFIX = normalizeApiPrefix(import.meta.env.VITE_API_PATH_PREFIX)

export const buildWsEvent = (route: string, prefix: string = WS_API_PREFIX): string =>
    `${prefix}/${route.replace(/^\/+/, '')}`
