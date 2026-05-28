import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders hero with correct h1', async ({ page }) => {
    await page.goto('/landing');
    await expect(page.locator('h1')).toContainText('Pin annotations');
    await expect(page.locator('h1')).toContainText('live frontends');
  });

  test('demo accepts a pin drop and persists across reload', async ({ page }) => {
    await page.goto('/landing#demo');
    const annotCards = page.locator('[data-pin-target]');
    const before = await annotCards.count();

    await page.getByRole('button', { name: /new annotation/i }).click();
    await page
      .frameLocator('iframe[title="Mockup"]')
      .locator('body')
      .click({ position: { x: 200, y: 200 } });
    await page.getByRole('textbox', { name: /annotation body/i }).fill('Smoke test annotation');
    await page.getByRole('button', { name: /^send$/i }).click();

    await expect(annotCards).toHaveCount(before + 1);
    await page.reload();
    await expect(annotCards).toHaveCount(before + 1);
  });

  test('reset demo restores seeded state after confirmation', async ({ page }) => {
    await page.goto('/landing#demo');
    const annotCards = page.locator('[data-pin-target]');
    await expect(annotCards).toHaveCount(3);

    // Drop a 4th annotation via the draft flow so reset has something to clear.
    await page.getByRole('button', { name: /new annotation/i }).click();
    await page
      .frameLocator('iframe[title="Mockup"]')
      .locator('body')
      .click({ position: { x: 150, y: 150 } });
    await page.getByRole('textbox', { name: /annotation body/i }).fill('Extra annotation');
    await page.getByRole('button', { name: /^send$/i }).click();
    await expect(annotCards).toHaveCount(4);

    // Two-step confirm: first click arms the confirm, second click resets.
    // Match BOTH the rest-state ("Reset demo") and the armed-state
    // ("Click again to confirm") so the second click doesn't wait for the
    // 3s confirm window to expire before the locator resolves again.
    const reset = page.getByRole('button', { name: /Reset|Click again/i });
    await reset.click();
    await reset.click();
    await expect(annotCards).toHaveCount(3);
  });

  test('no horizontal scroll on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto('/landing');
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientW = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollW).toBeLessThanOrEqual(clientW + 1);
  });

  test('contributors section is hidden when <3 real contributors', async ({ page }) => {
    await page.route('**/api.github.com/repos/alkg-cloud/markup/contributors**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            login: 'AlexandreCamillo',
            type: 'User',
            avatar_url: 'https://avatars.example/AC',
            contributions: 1,
          },
        ]),
      });
    });
    await page.goto('/landing');
    await expect(page.locator('.has-contributors')).toHaveCount(0);
  });
});
