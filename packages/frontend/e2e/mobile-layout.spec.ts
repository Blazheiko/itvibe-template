import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const IPHONE_VIEWPORT = { width: 390, height: 844 }

const expectBottomInsideViewport = async (page: Page, selectorName: string, locator: Locator) => {
    const box = await locator.boundingBox()
    const viewport = page.viewportSize()

    expect(box, `${selectorName} should have a visible bounding box`).not.toBeNull()
    expect(viewport, 'viewport size should be available').not.toBeNull()

    const targetBox = box!
    const targetViewport = viewport!

    // boundingBox() is { x, y, width, height }: there is no `bottom` field.
    const bottom = targetBox.y + targetBox.height
    expect(bottom, `${selectorName} bottom must stay inside viewport`).toBeLessThanOrEqual(
        targetViewport.height,
    )
}

test.describe('mobile layout regression', () => {
    test.use({
        viewport: IPHONE_VIEWPORT,
        isMobile: true,
        hasTouch: true,
    })

    test('registration submit button is not hidden behind bottom browser UI', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('button', { name: 'Create Account' }).first().click()

        // The open modal; the page header has its own "Create Account" button.
        const modal = page.locator('.modal-overlay.show .modal')
        const submitButton = modal.getByRole('button', { name: 'Create Account', exact: true })
        // With phone auth enabled (VITE_AUTH_PHONE_ENABLED) the modal opens on a
        // choice step first; the email form holds the submit button.
        const emailChoice = modal.getByRole('button', { name: 'Continue with email' })
        await expect(submitButton.or(emailChoice)).toBeVisible()
        // The step depends on the build-time env of the dev server, not on the
        // test: one spec covers both configurations.
        // eslint-disable-next-line playwright/no-conditional-in-test
        if (await emailChoice.isVisible()) {
            await emailChoice.click()
        }

        await expect(submitButton).toBeVisible()
        await expectBottomInsideViewport(page, 'register submit button', submitButton)
    })

    test('support input stays visible above bottom browser UI', async ({ page }) => {
        await page.route('**/api/main/init', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    user: { id: '1', name: 'E2E User', email: 'e2e@example.com', role: 'user' },
                    // App.vue signs the user in only with a non-empty wsUrl and wsToken;
                    // the socket itself fails to connect, which this test does not need.
                    wsUrl: 'ws://127.0.0.1:65535',
                    wsToken: 'e2eWsToken000001',
                    storage: {},
                }),
            })
        })

        // The fake socket never opens, so the client refreshes the WS token over
        // HTTP (a failed handshake is handled like 4001). Answer it here instead
        // of letting the dev-server proxy reach whatever listens on port 3000.
        let wsTokenRefreshes = 0
        await page.route('**/api/main/update-ws-token', async (route) => {
            wsTokenRefreshes++
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    wsUrl: 'ws://127.0.0.1:65535',
                    wsToken: 'e2eWsToken000001',
                }),
            })
        })

        await page.route('**/api/support/chat/history', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    data: [
                        {
                            id: '1',
                            role: 'assistant',
                            content: 'How can I help?',
                            screenshots: null,
                            createdAt: '2026-05-20T00:00:00.000Z',
                        },
                    ],
                }),
            })
        })

        await page.goto('/support')

        const messageInput = page.locator('.support-input')
        await expect(messageInput).toBeVisible()
        await expectBottomInsideViewport(page, 'support message input', messageInput)

        // Handshakes keep failing: one immediate refresh, then at most one per 5 s.
        await page.waitForTimeout(3000)
        expect(wsTokenRefreshes).toBeGreaterThanOrEqual(1)
        expect(wsTokenRefreshes).toBeLessThanOrEqual(2)
    })
})
