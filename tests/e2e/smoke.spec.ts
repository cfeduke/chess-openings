import { expect, test } from '@playwright/test';

test('the production build serves the app shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Chess Openings/);
  await expect(page.getByRole('heading', { level: 1, name: 'Chess Openings' })).toBeVisible();
});
