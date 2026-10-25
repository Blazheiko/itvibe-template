// WS request events are `<API_PATH_PREFIX>/<route>`, the same keys the server
// builds for its WS routes, so the frontend must use the backend's prefix
// (code-issues item 17).
import { API_PREFIX } from './api-path'

export { normalizeApiPrefix } from './api-path'

export const buildWsEvent = (route: string, prefix: string = API_PREFIX): string =>
    `${prefix}/${route.replace(/^\/+/, '')}`
