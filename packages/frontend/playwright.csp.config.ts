import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

/**
 * CSP checks against the production build served by the backend (SERVE_STATIC=true),
 * not the Vite dev/preview server: only then are the response headers the real ones.
 * Run via `pnpm --filter frontend test:e2e:csp`, which builds once and then runs this
 * config twice, CSP_E2E_MODE=enforce and CSP_E2E_MODE=report-only. Both modes use the
 * same port because the bundle has its API origin (VITE_BASE_URL) baked in.
 * Requires PostgreSQL and Redis from packages/backend/.env.
 */
const PORT = 3000
const MODE = process.env.CSP_E2E_MODE === 'report-only' ? 'report-only' : 'enforce'

export default defineConfig({
    testDir: './e2e-csp',
    timeout: 30 * 1000,
    forbidOnly: !!process.env.CI,
    workers: 1,
    reporter: 'list',
    outputDir: `test-results/csp-${MODE}`,
    use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: MODE }],
    webServer: {
        command: '../../scripts/prod-local.sh',
        env: {
            PROD_LOCAL_SKIP_BUILD: 'true',
            PORT: String(PORT),
            CSP_REPORT_ONLY: String(MODE === 'report-only'),
        },
        url: `http://localhost:${PORT}/`,
        // Never reuse: a server started in the other mode would send the wrong header.
        reuseExistingServer: false,
        timeout: 60 * 1000,
    },
})
