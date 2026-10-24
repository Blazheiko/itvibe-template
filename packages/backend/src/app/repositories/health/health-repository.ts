import { db } from '#database/db.js'
import { sql } from 'drizzle-orm'

export const healthRepository = {
    /** Throws when PostgreSQL does not answer. */
    async pingDatabase(): Promise<void> {
        await db.execute(sql`SELECT 1`)
    },
}
