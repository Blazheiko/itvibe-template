/**
 * `undefined` for a missing or empty string, otherwise the value as is.
 * Use with `??` where an empty env variable (`KEY=`) must fall back to the default.
 */
export function nonEmpty(value: string | null | undefined): string | undefined {
    return value === undefined || value === null || value === '' ? undefined : value
}
