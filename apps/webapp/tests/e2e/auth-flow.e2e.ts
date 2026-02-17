import { expect, test } from '@playwright/test';

test.skip(true, 'Requires SST router runtime for full auth E2E');

test('shows anonymous and login options', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\//);
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
});

test('can continue as anonymous and load dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByText('Navigation')).toBeVisible();
});
