// Helpers for *.pg.test.ts. vitest.pg.config.ts runs pg-global-setup.ts, which
// creates a throwaway database from PG_TEST_URL, applies the migrations and
// points PGSQL_* at it, so `#database/db.js` connects there. Without PG_TEST_URL
// the suites are skipped.

export const PG_TEST_URL = process.env['PG_TEST_URL']
export const hasPg = PG_TEST_URL !== undefined && PG_TEST_URL !== ''

export const MIGRATIONS_FOLDER = new URL('../drizzle/migrations', import.meta.url).pathname
