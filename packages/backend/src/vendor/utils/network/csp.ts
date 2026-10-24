import type { Header } from '#vendor/types/types.js'

export type CspKind = 'document' | 'svg' | 'strict'
export type CspDirectives = Readonly<Record<string, readonly string[] | true>>
export type CspHeaders = Readonly<Record<CspKind, Header | null>>

export const CSP_HEADER = 'content-security-policy'
export const CSP_REPORT_ONLY_HEADER = 'content-security-policy-report-only'

// For API JSON, errors and anything a browser should never render as a page.
export const STRICT_CSP = "default-src 'none'; frame-ancestors 'none'"
// An SVG opened directly is a document and may carry scripts; inline styles are common in SVG.
export const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"

// `;` separates directives, `,` separates policies, whitespace separates sources:
// a value from env containing any of them would inject into the header.
const UNSAFE_SOURCE = /[;,\s]/

type OriginScheme = 'http' | 'ws'

const ALLOWED_PROTOCOLS: Readonly<Record<OriginScheme, readonly string[]>> = {
    http: ['http:', 'https:'],
    ws: ['ws:', 'wss:'],
}

export class CspConfigError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'CspConfigError'
    }
}

const parseUrl = (value: string, label: string): URL => {
    if (value === '' || UNSAFE_SOURCE.test(value)) {
        throw new CspConfigError(`${label} must not be empty or contain ';', ',' or whitespace`)
    }
    try {
        return new URL(value)
    } catch {
        throw new CspConfigError(`${label} must be an absolute URL, got "${value}"`)
    }
}

/** Validates that `value` is exactly an origin (scheme + host + port) of the given scheme family. */
export const parseOrigin = (
    value: string,
    schemes: readonly OriginScheme[],
    label: string,
): string => {
    const trimmed = value.trim()
    const normalized = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
    const url = parseUrl(normalized, label)
    const protocols = schemes.flatMap((scheme) => ALLOWED_PROTOCOLS[scheme])
    if (!protocols.includes(url.protocol)) {
        throw new CspConfigError(`${label} must use ${protocols.join(' or ')}, got "${value}"`)
    }
    if (url.origin !== normalized) {
        throw new CspConfigError(
            `${label} must be an origin without path, query or credentials, got "${value}"`,
        )
    }
    return url.origin
}

/** Comma-separated list of origins; empty input yields an empty list. */
export const parseOriginList = (
    value: string | undefined,
    schemes: readonly OriginScheme[],
    label: string,
): string[] =>
    (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '')
        .map((item) => parseOrigin(item, schemes, label))

/** Takes the origin of a full URL (e.g. CDN_URL or the WS endpoint), which may carry a path. */
export const originOf = (
    value: string,
    schemes: readonly OriginScheme[],
    label: string,
): string => {
    const url = parseUrl(value.trim(), label)
    return parseOrigin(url.origin, schemes, label)
}

/** A report endpoint is a full URL and may have a path, unlike the source origins. */
export const parseReportUri = (value: string, label: string): string => {
    const url = parseUrl(value.trim(), label)
    if (!ALLOWED_PROTOCOLS.http.includes(url.protocol)) {
        throw new CspConfigError(`${label} must use http: or https:, got "${value}"`)
    }
    return url.href
}

export const buildCspValue = (directives: CspDirectives): string => {
    const parts: string[] = []
    for (const [name, sources] of Object.entries(directives)) {
        if (sources === true) {
            parts.push(name)
            continue
        }
        const unique = [...new Set(sources)]
        if (unique.length === 0) continue
        for (const source of unique) {
            if (UNSAFE_SOURCE.test(source)) {
                throw new CspConfigError(
                    `CSP source "${source}" in ${name} contains ';', ',' or whitespace`,
                )
            }
        }
        parts.push(`${name} ${unique.join(' ')}`)
    }
    return parts.join('; ')
}

export type DocumentPolicyInput = {
    isProduction: boolean
    apiOrigin: string | null
    wsOrigin: string | null
    sentryOrigin: string | null
    mediaOrigin: string | null
    extraConnectSrc: readonly string[]
    extraImgSrc: readonly string[]
    reportUri: string | null
}

const optional = (value: string | null): string[] => (value === null ? [] : [value])

/** The policy for HTML documents (the SPA shell), built from the origins the browser actually talks to. */
export const buildDocumentDirectives = (input: DocumentPolicyInput): CspDirectives => {
    const styleSrc = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']
    const directives: Record<string, readonly string[] | true> = {
        'default-src': ["'self'"],
        'base-uri': ["'self'"],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'script-src': ["'self'"],
        'style-src': styleSrc,
        'style-src-elem': styleSrc,
        'img-src': [
            "'self'",
            'data:',
            'blob:',
            ...optional(input.mediaOrigin),
            ...input.extraImgSrc,
        ],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
        'connect-src': [
            "'self'",
            ...optional(input.apiOrigin),
            ...optional(input.wsOrigin),
            ...optional(input.sentryOrigin),
            ...input.extraConnectSrc,
            // Vite HMR and local tooling when the backend serves a dev build.
            ...(input.isProduction ? [] : ['ws://localhost:*', 'ws://127.0.0.1:*']),
        ],
    }
    if (input.isProduction) directives['upgrade-insecure-requests'] = true
    if (input.reportUri !== null) directives['report-uri'] = [input.reportUri]
    return directives
}

export const getCspHeaderName = (reportOnly: boolean): string =>
    reportOnly ? CSP_REPORT_ONLY_HEADER : CSP_HEADER

/**
 * One mode for every response type: disabled → no global CSP anywhere; report-only →
 * every global policy is Report-Only, so no global enforcing policy can block the app
 * while it is being observed (multiple policies are enforced independently, CSP3 §8.1).
 */
export const resolveCspHeaders = (config: {
    enabled: boolean
    reportOnly: boolean
    documentPolicy: string
}): CspHeaders => {
    if (!config.enabled) return { document: null, svg: null, strict: null }
    const name = getCspHeaderName(config.reportOnly)
    return {
        document: config.documentPolicy === '' ? null : { name, value: config.documentPolicy },
        svg: { name, value: SVG_CSP },
        strict: { name, value: STRICT_CSP },
    }
}

/** True when a controller set its own policy; the global one is then skipped. */
export const hasCspHeader = (headers: readonly Header[]): boolean =>
    headers.some((header) => {
        const name = header.name.toLowerCase()
        return name === CSP_HEADER || name === CSP_REPORT_ONLY_HEADER
    })
