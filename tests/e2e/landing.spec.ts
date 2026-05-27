import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders hero with correct h1', async ({ page }) => {
    await page.goto('/landing');
    await expect(page.locator('h1')).toContainText('Pin annotations');
    await expect(page.locator('h1')).toContainText('live frontends');
  });

  test('demo accepts a pin drop and persists across reload', async ({ page }) => {
    await page.goto('/landing#demo');
    await page.evaluate(() => {
      window.prompt = () => 'Smoke test annotation';
    });
    const annotItems = page.locator('ul li[aria-label^="Annotation "]');
    const before = await annotItems.count();
    await page.getByRole('button', { name: /Drop pin/i }).click();
    const canvas = page.locator('[role="application"][aria-label*="Mockup canvas"]');
    await canvas.click({ position: { x: 200, y: 200 } });
    await expect(annotItems).toHaveCount(before + 1);
    await page.reload();
    await expect(annotItems).toHaveCount(before + 1);
  });

  test('reset demo restores seeded state after confirmation', async ({ page }) => {
    await page.goto('/landing#demo');
    const reset = page.getByRole('button', { name: /Reset demo/i });
    await reset.click();
    await expect(reset).toContainText(/Click again to confirm/);
    await reset.click();
    await expect(page.locator('ul li[aria-label^="Annotation "]')).toHaveCount(3);
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
