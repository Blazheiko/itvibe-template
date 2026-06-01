import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const IPHONE_VIEWPORT = { width: 390, height: 844 }

const expectBottomInsideViewport = async (
  page: Page,
  selectorName: string,
  locator: Locator,
) => {
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()

  expect(box, `${selectorName} should have a visible bounding box`).not.toBeNull()
  expect(viewport, 'viewport size should be available').not.toBeNull()

  const targetBox = box!
  const targetViewport = viewport!

  expect(targetBox.bottom, `${selectorName} bottom must stay inside viewport`).toBeLessThanOrEqual(
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

    const submitButton = page.locator('.modal.register-modal .auth-button', {
      hasText: 'Create Account',
    })

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
          wsUrl: 'ws://127.0.0.1:65535',
          wsToken: '',
          storage: {},
        }),
      })
    })

    await page.route('**/api/support/chat/history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          messages: [
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
  })
})
