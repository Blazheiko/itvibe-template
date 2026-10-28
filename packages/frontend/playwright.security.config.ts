import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

import { ORIGIN, PORT } from './e2e-security/fixtures'

/**
 * CSRF and Service Worker checks against the production build served by the real
 * backend (scripts/prod-local.sh, SERVE_STATIC=true) with CSRF enforcement on: only
 * then do the guard, the session cookie and the registered service worker behave as
 * in production. Run via `pnpm --filter frontend test:e2e:security`, which builds
 * once and seeds two demo accounts (e2e-security/global-setup.ts).
 * Requires PostgreSQL and Redis from packages/backend/.env.
 */

export default defineConfig({
    testDir: './e2e-security',
    timeout: 30 * 1000,
    forbidOnly: !!process.env.CI,
    workers: 1,
    reporter: 'list',
    outputDir: 'test-results/security',
    globalSetup: './e2e-security/global-setup.ts',
    use: {
        ...devices['Desktop Chrome'],
        baseURL: ORIGIN,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: '../../scripts/prod-local.sh',
        env: {
            PROD_LOCAL_SKIP_BUILD: 'true',
            PORT: String(PORT),
            CSRF_ENFORCE: 'true',
            CSRF_STRICT_ORIGIN: 'true',
            CSRF_ALLOWED_ORIGINS: ORIGIN,
            // Every scenario signs in, several times: keep the per-IP login limit out of the way.
            AUTH_LOGIN_MAX_ATTEMPTS_PER_IP: '10000',
        },
        url: `${ORIGIN}/`,
        // Never reuse: a server started with other CSRF settings would hide failures.
        reuseExistingServer: false,
        timeout: 60 * 1000,
    },
})
