/**
 * Reads a `KEY=value` line from .env content. Quotes around the value are
 * stripped; a missing key or an empty value gives ''.
 */
export const readEnvValue = (content: string, key: string): string => {
    const match = new RegExp(`^${key}=(.*)$`, 'm').exec(content)
    if (match === null) return ''
    return (match[1] ?? '').trim().replace(/^(['"])(.*)\1$/, '$2')
}

/**
 * Sets each key in .env content: an existing `KEY=` line is replaced in place,
 * a missing key is appended at the end. Other lines are kept as they are.
 */
export const upsertEnvValues = (content: string, values: Record<string, string>): string => {
    let result = content
    for (const [key, value] of Object.entries(values)) {
        const line = `${key}="${value}"`
        const pattern = new RegExp(`^${key}=.*$`, 'm')
        if (pattern.test(result)) {
            result = result.replace(pattern, line)
        } else {
            const separator = result === '' || result.endsWith('\n') ? '' : '\n'
            result = `${result}${separator}${line}\n`
        }
    }
    return result
}
