// If-None-Match evaluation for GET/HEAD (RFC 9110 §13.1.2): "*" matches any
// current representation; otherwise a comma-separated list of entity tags,
// compared weakly (W/"x" equals "x"). Used to answer 304 (code-issues item 40).
const opaque = (tag: string): string => (tag.startsWith('W/') ? tag.slice(2) : tag)

export function matchesIfNoneMatch(header: string, etag: string): boolean {
    const value = header.trim()
    if (value === '') return false
    if (value === '*') return true
    const current = opaque(etag)
    return value
        .split(',')
        .map((tag) => tag.trim())
        .some((tag) => tag !== '' && opaque(tag) === current)
}
