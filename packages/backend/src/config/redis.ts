import { env } from 'node:process'
import { nonEmpty } from '#vendor/utils/env/non-empty.js'

const INTEGER = /^\d+$/
const errors: string[] = []

const readPositiveInteger = (name: string, fallback: number): number => {
    const raw = env[name]
    if (raw === undefined) return fallback
    const value = raw.trim()
    const parsed = Number(value)
    if (!INTEGER.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
        errors.push(`${name} must be an integer >= 1, got "${raw}"`)
        return fallback
    }
    return parsed
}

export default Object.freeze({
    port: Number(nonEmpty(env['REDIS_PORT']) ?? 6379),
    host: nonEmpty(env['REDIS_HOST']) ?? '127.0.0.1',
    password: nonEmpty(env['REDIS_PASSWORD']) ?? null,
    keyPrefix: nonEmpty(env['REDIS_PREFIX']) ?? 'uwebsocket:', // max 16 characters long, only letters, numbers, :,_,-
    /** Command timeout of the main (sessions, WS tokens) client. */
    commandTimeoutMs: readPositiveInteger('REDIS_COMMAND_TIMEOUT_MS', 500),
    /** Whole SCAN/DEL loop of destroyAllSessions (logoutAll). */
    logoutAllDeadlineMs: readPositiveInteger('REDIS_LOGOUT_ALL_DEADLINE_MS', 2000),
    configError: errors.length > 0 ? errors.join('; ') : null,
})
