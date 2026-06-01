import { expect, test } from '@playwright/test'

test('loads login page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
})
