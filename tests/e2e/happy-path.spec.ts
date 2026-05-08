import path from 'node:path';
import { expect, test } from '@playwright/test';

test('setup → upload → comment → resolve', async ({ page, request }) => {
  // Setup wizard
  await page.goto('/setup');
  await page.fill('input[type=email]', 'admin@example.com');
  // First text input is "Name", second is email handled above. Fill name explicitly.
  const nameInput = page.locator('input').nth(0);
  await nameInput.fill('Admin');
  await page.fill('input[type=password]', 'longadminpassword42');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/mockups$/);

  // Upload via API while we're authenticated (cookie set on the page context)
  const cookies = await page.context().cookies();
  const sessCookie = cookies.find((c) => c.name === 'mk_session');
  expect(sessCookie).toBeTruthy();

  const zipPath = path.resolve('tests/fixtures/mockups/valid-simple.zip');
  const fs = await import('node:fs');
  const zipBuf = fs.readFileSync(zipPath);
  const upload = await request.post('/api/mockups', {
    headers: { cookie: `mk_session=${sessCookie!.value}` },
    multipart: {
      name: 'My Mockup',
      build: { name: 'mockup.zip', mimeType: 'application/zip', buffer: zipBuf },
    },
  });
  expect(upload.status()).toBe(201);
  const created = await upload.json();

  // Open the viewer
  await page.goto(`/mockups/${created.id}`);
  await page.waitForSelector('iframe');

  // Comment flow
  await page.click('[data-testid=comment-button]');
  await page.fill('textarea', 'navbar too large');

  // Draw a small stroke on the tldraw canvas so the persisted JSON is non-empty.
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  await page.mouse.move(box.x + 50, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 120, { steps: 10 });
  await page.mouse.up();

  await page.click('[data-testid=annotation-save]');

  // Open the new annotation, resolve
  await page.click('[data-testid=annotation-card]');

  // Pull the annotation row from the API and assert tldraw JSON is non-empty.
  const detail = await request.get(`/api/annotations/${(await page.url()).split('/').pop()}`, {
    headers: { cookie: `mk_session=${sessCookie!.value}` },
  });
  const detailBody = await detail.json();
  expect(detailBody.tldraw).toBeTruthy();
  expect(JSON.stringify(detailBody.tldraw).length).toBeGreaterThan(50);

  // Detail page now overlays a tldraw read-only canvas
  await expect(page.locator('[data-testid=annotation-readonly-canvas]')).toBeVisible();

  await page.click('[data-testid=thread-resolve]');
  await expect(page.locator('[data-testid=thread-status]')).toHaveText(/resolved/i);
});
