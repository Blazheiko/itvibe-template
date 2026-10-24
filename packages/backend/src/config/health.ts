import { env } from 'node:process'

// Per-dependency timeout of GET /ready (code-issues item 35).
const readTimeout = (): { readinessTimeoutMs: number; configError: string | null } => {
    const raw = env['READINESS_CHECK_TIMEOUT_MS']
    if (raw === undefined || raw.trim() === '')
        return { readinessTimeoutMs: 1000, configError: null }
    const value = Number(raw.trim())
    if (!/^\d+$/.test(raw.trim()) || value < 50 || value > 30_000) {
        return {
            readinessTimeoutMs: 1000,
            configError: `READINESS_CHECK_TIMEOUT_MS must be an integer from 50 to 30000, got "${raw}"`,
        }
    }
    return { readinessTimeoutMs: value, configError: null }
}

export default Object.freeze(readTimeout())
