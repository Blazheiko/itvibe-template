// Helpers for *.pg.test.ts. vitest.pg.config.ts runs pg-global-setup.ts, which
// creates a throwaway database from PG_TEST_URL, applies the migrations and
// points PGSQL_* at it, so `#database/db.js` connects there. Without PG_TEST_URL
// the suites are skipped.

import { fileURLToPath } from 'node:url'

export const PG_TEST_URL = process.env['PG_TEST_URL']
export const hasPg = PG_TEST_URL !== undefined && PG_TEST_URL !== ''

// fileURLToPath: .pathname keeps %20 and breaks on Windows drive letters.
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle/migrations', import.meta.url))
