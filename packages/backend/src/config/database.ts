import { env } from 'node:process'

// Single source of PostgreSQL settings for the app, db:create and drizzle-kit.
// Imported by drizzle.config.ts too, so keep it free of path aliases and app imports.

export interface DatabaseConfig {
    client: string
    host: string
    port: number
    user: string
    password: string
    database: string
}

export const DATABASE_DEFAULTS = Object.freeze({
    client: 'pg',
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'itvibe_template',
})

const nonEmpty = (value: string | undefined): string | undefined =>
    value === undefined || value.trim() === '' ? undefined : value.trim()

const parsePort = (value: string | undefined): number => {
    const raw = nonEmpty(value)
    if (raw === undefined) return DATABASE_DEFAULTS.port
    const port = Number(raw)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`PGSQL_PORT must be an integer from 1 to 65535, got "${raw}"`)
    }
    return port
}

export const resolveDatabaseConfig = (
    source: Record<string, string | undefined> = env,
): DatabaseConfig =>
    Object.freeze({
        client: nonEmpty(source['DB_CONNECTION']) ?? DATABASE_DEFAULTS.client,
        host: nonEmpty(source['PGSQL_HOST']) ?? DATABASE_DEFAULTS.host,
        port: parsePort(source['PGSQL_PORT']),
        user: nonEmpty(source['PGSQL_USER']) ?? DATABASE_DEFAULTS.user,
        password: source['PGSQL_PASSWORD'] ?? DATABASE_DEFAULTS.password,
        database: nonEmpty(source['PGSQL_DB_NAME']) ?? DATABASE_DEFAULTS.database,
    })

export default resolveDatabaseConfig()
