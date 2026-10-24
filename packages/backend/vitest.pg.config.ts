import { configDefaults, defineConfig } from 'vitest/config'

import baseConfig from './vitest.config.ts'

// Integration tests against a real PostgreSQL with pgvector (PG_TEST_URL). The
// global setup creates a throwaway database and applies the migrations; without
// the variable every suite is skipped. Built by hand rather than with mergeConfig,
// which would concatenate the base exclude list.
export default defineConfig({
    ...baseConfig,
    test: {
        ...baseConfig.test,
        include: ['src/**/*.pg.test.ts'],
        exclude: [...configDefaults.exclude, 'dist/**'],
        globalSetup: ['./src/test-support/pg-global-setup.ts'],
        fileParallelism: false,
    },
})
