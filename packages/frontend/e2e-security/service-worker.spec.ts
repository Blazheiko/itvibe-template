import { expect, test, type Page } from '@playwright/test'

import { USER_1 } from './fixtures'

/**
 * The service worker of the production build must never put API responses into
 * Cache Storage. Removing what an older worker cached runs on activation and is
 * covered by the unit test of removeCachedApiResponses: Chromium's Cache Storage
 * in a fresh context cannot be seeded reliably before a worker activates.
 */

const cachedUrls = (page: Page): Promise<string[]> =>
    page.evaluate(async () => {
        const urls: string[] = []
        for (const name of await caches.keys()) {
            const cache = await caches.open(name)
            for (const request of await cache.keys()) urls.push(request.url)
        }
        return urls
    })

const waitForController = async (page: Page): Promise<void> => {
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready
    })
    // The first load is not controlled yet: reload under the active worker.
    await page.reload()
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
}

const isApi = (url: string) => new URL(url).pathname.startsWith('/api/')

test('API responses never reach Cache Storage', async ({ page }) => {
    await page.goto('/login')
    await waitForController(page)

    await page.locator('#login-identifier').fill(USER_1.email)
    await page.locator('#login-password').fill(USER_1.password)
    await page
        .locator('button.auth-button', { has: page.locator('span', { hasText: 'Sign In' }) })
        .click()
    await expect(page.getByText(USER_1.email)).toBeVisible()
    await page.reload()
    await expect(page.getByText(USER_1.email)).toBeVisible()

    const urls = await cachedUrls(page)
    expect(urls.length).toBeGreaterThan(0) // the worker does cache the shell and assets
    expect(urls.filter(isApi)).toEqual([])
})
