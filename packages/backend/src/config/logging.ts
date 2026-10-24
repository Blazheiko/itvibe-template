import { env } from 'node:process'

// Pino level for the backend log (code-issues item 34). An invalid value keeps
// `info` so the logger still works and validateRuntimeConfig() stops the start
// with the message below.
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

const readLevel = (): { level: LogLevel; configError: string | null } => {
    const raw = (env['LOG_LEVEL'] ?? '').trim().toLowerCase()
    if (raw === '') return { level: 'info', configError: null }
    if ((LOG_LEVELS as readonly string[]).includes(raw)) {
        return { level: raw as LogLevel, configError: null }
    }
    return {
        level: 'info',
        configError: `LOG_LEVEL must be one of ${LOG_LEVELS.join(', ')}, got "${raw}"`,
    }
}

export default Object.freeze(readLevel())
