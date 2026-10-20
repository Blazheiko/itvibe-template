import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { expect, test, type Page } from '@playwright/test'

/**
 * Runs twice (playwright.csp.config.ts): project `enforce` against a backend with
 * CSP_REPORT_ONLY=false and project `report-only` against one with CSP_REPORT_ONLY=true.
 */

type Violation = { effectiveDirective: string; disposition: string; blockedURI: string }

declare global {
    interface Window {
        __cspViolations: Violation[]
        __inlineRan?: boolean
    }
}

const CSP = 'content-security-policy'
const CSP_REPORT_ONLY = 'content-security-policy-report-only'

// A controlled origin outside the policy that allows CORS: fetch results then depend only
// on CSP, never on CORS, DNS or TLS.
let probe: Server
let probeOrigin = ''

test.beforeAll(async () => {
    probe = createServer((_req, res) => {
        res.writeHead(200, { 'access-control-allow-origin': '*', 'content-type': 'text/plain' })
        res.end('probe-ok')
    })
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
    probeOrigin = `http://127.0.0.1:${(probe.address() as AddressInfo).port}`
})

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        window.__cspViolations = []
        document.addEventListener('securitypolicyviolation', (event) => {
            window.__cspViolations.push({
                effectiveDirective: event.effectiveDirective,
                disposition: event.disposition,
                blockedURI: event.blockedURI,
            })
        })
    })
})

test.afterAll(async () => {
    await new Promise((resolve) => probe.close(resolve))
})

const violations = (page: Page) => page.evaluate(() => window.__cspViolations)

// ArkType probes whether JIT is allowed with `new Function("return false")` in a
// try/catch and falls back to jitless mode under CSP: an expected, harmless report.
const isArkTypeJitProbe = (violation: Violation) =>
    violation.blockedURI === 'eval' && violation.effectiveDirective === 'script-src'

const unexpectedViolations = async (page: Page) =>
    (await violations(page)).filter((violation) => !isArkTypeJitProbe(violation))

const isReportOnly = () => test.info().project.name === 'report-only'
const expectedHeader = () => (isReportOnly() ? CSP_REPORT_ONLY : CSP)
const otherHeader = () => (isReportOnly() ? CSP : CSP_REPORT_ONLY)

test('the HTML document carries exactly the policy of the current mode', async ({ page }) => {
    const response = await page.goto('/')
    const headers = response?.headers() ?? {}

    expect(headers[expectedHeader()]).toContain("script-src 'self'")
    expect(headers[otherHeader()]).toBeUndefined()
})

test('registration, WebSocket and fonts work without violations', async ({ page }) => {
    const websocket = page.waitForEvent('websocket', { timeout: 15_000 })
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()

    await page.getByRole('button', { name: 'Create Account' }).first().click()
    const modal = page.locator('.modal-overlay.show')
    await modal.getByRole('button', { name: /email/i }).click()

    const email = `csp-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
    await modal.locator('#register-name').fill('CSP E2E')
    await modal.locator('#register-email').fill(email)
    await modal.locator('#register-password').fill('CspE2e-Password-123')
    await modal.locator('#register-password-confirm').fill('CspE2e-Password-123')
    // The checkbox input is visually hidden behind a custom control: click its label.
    await modal.locator('.checkbox-container').click()
    await expect(modal.locator('input[type="checkbox"]')).toBeChecked()
    await modal.locator('.auth-button', { hasText: 'Create Account' }).click()

    const ws = await websocket
    expect(ws.url()).toMatch(/^ws:\/\/localhost:\d+\//)
    await expect.poll(() => ws.isClosed()).toBe(false)
    await expect.poll(() => page.evaluate(() => document.fonts.check('16px Inter'))).toBe(true)

    expect(await unexpectedViolations(page)).toEqual([])
})

test('the service worker registers and serves the shell offline', async ({ page, context }) => {
    await page.goto('/')
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready
    })
    // Let the worker take control and populate its cache.
    await page.reload()
    await expect
        .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
        .toBe(true)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await context.setOffline(false)

    expect(await unexpectedViolations(page)).toEqual([])
})

test('an injected inline script is blocked (enforce) or only reported (report-only)', async ({
    page,
}) => {
    await page.goto('/')
    await page.evaluate(() => {
        const script = document.createElement('script')
        script.textContent = 'window.__inlineRan = true'
        document.body.appendChild(script)
    })

    const inlineViolation = async () =>
        (await violations(page)).find((item) => item.blockedURI === 'inline')
    await expect.poll(inlineViolation).toBeDefined()
    const violation = await inlineViolation()
    // For an inline element the effective directive is script-src-elem even when the
    // restriction comes from the script-src fallback (CSP3 "effective directive").
    expect(violation?.effectiveDirective).toBe('script-src-elem')
    expect(violation?.disposition).toBe(isReportOnly() ? 'report' : 'enforce')
    expect(await page.evaluate(() => window.__inlineRan === true)).toBe(isReportOnly())
})

test('fetch to an origin outside connect-src is blocked (enforce) or only reported', async ({
    page,
}) => {
    await page.goto('/')
    const result = await page.evaluate(async (url) => {
        try {
            const response = await fetch(url)
            return { ok: true, body: await response.text() }
        } catch (error) {
            return { ok: false, body: String(error) }
        }
    }, `${probeOrigin}/probe`)

    // enforce: the request never leaves the page; report-only: it goes through.
    expect(result.ok).toBe(isReportOnly())
    expect(result.body === 'probe-ok').toBe(isReportOnly())

    await expect.poll(async () => (await violations(page)).length).toBeGreaterThan(0)
    const violation = (await violations(page)).find((item) =>
        item.blockedURI.startsWith(probeOrigin),
    )
    expect(violation?.effectiveDirective).toBe('connect-src')
    expect(violation?.disposition).toBe(isReportOnly() ? 'report' : 'enforce')
})
