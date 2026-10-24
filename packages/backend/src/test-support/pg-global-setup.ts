import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

import { MIGRATIONS_FOLDER, PG_TEST_URL, hasPg } from './pg-test-db.js'

// Vitest globalSetup for test:pg. Runs once in the main process before the workers
// start, so the PGSQL_* values set here are inherited by every test file.
// The database name is unique per run and dropped in teardown.

const quoteIdent = (name: string): string => `"${name.replaceAll('"', '""')}"`

export default async function setup(): Promise<(() => Promise<void>) | undefined> {
    if (!hasPg || PG_TEST_URL === undefined) return undefined

    const url = new URL(PG_TEST_URL)
    const database = `itvibe_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`
    const admin = new pg.Client({ connectionString: PG_TEST_URL })
    await admin.connect()
    await admin.query(`CREATE DATABASE ${quoteIdent(database)}`)
    await admin.end()

    const connection = {
        host: url.hostname,
        port: Number(url.port || 5432),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database,
    }
    const client = new pg.Client(connection)
    await client.connect()
    try {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector')
        // Same migrations table as drizzle.config.ts, so the schema matches db:migrate.
        await migrate(drizzle({ client }), {
            migrationsFolder: MIGRATIONS_FOLDER,
            migrationsTable: '__drizzle_migrations',
            migrationsSchema: 'drizzle',
        })
    } finally {
        await client.end()
    }

    process.env['PGSQL_HOST'] = connection.host
    process.env['PGSQL_PORT'] = String(connection.port)
    process.env['PGSQL_USER'] = connection.user
    process.env['PGSQL_PASSWORD'] = connection.password
    process.env['PGSQL_DB_NAME'] = database

    return async () => {
        const dropper = new pg.Client({ connectionString: PG_TEST_URL })
        await dropper.connect()
        await dropper.query(`DROP DATABASE IF EXISTS ${quoteIdent(database)} WITH (FORCE)`)
        await dropper.end()
    }
}
