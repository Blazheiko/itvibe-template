import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import databaseConfig from '#config/database.js'
import appConfig from '#config/app.js'
import { relations } from './relations.js'
import logger from '#logger'

const pool = new pg.Pool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password,
    database: databaseConfig.database,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: false,
})

// PostgreSQL dropping an idle connection (restart, failover) emits 'error' on the
// pool; unhandled, Node turns it into an uncaughtException and the server stops.
// The pool replaces the client on its own; requests meanwhile get errors and
// /ready answers 503.
pool.on('error', (err) => {
    logger.error({ err }, 'PostgreSQL pool: idle client error')
})

const db = drizzle({
    client: pool,
    relations,
    logger: appConfig.env === 'prod' || appConfig.env === 'production' ? false : true,
})

export { db, pool }
