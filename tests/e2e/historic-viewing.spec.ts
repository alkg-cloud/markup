import path from 'node:path';
import { expect, test } from '@playwright/test';

test('view historic version → URL ?v, banner, read-only, exit, deep-link', async ({
  page,
  request,
}) => {
  // Setup wizard
  await page.goto('/setup');
  await page.fill('input[type=email]', 'admin@example.com');
  // First text input is "Name"
  const nameInput = page.locator('input').nth(0);
  await nameInput.fill('Admin');
  await page.fill('input[type=password]', 'longadminpassword42');
  await page.click('button[type=submit]');
  // The setup form redirects to '/' (the home dashboard) on success.
  await page.waitForURL(/localhost:3000\/?$/);
  await page.waitForLoadState('networkidle');

  // Upload v1 via API while authenticated (cookie set on the page context)
  const cookies = await page.context().cookies();
  const sess = cookies.find((c) => c.name === 'mk_session');
  expect(sess).toBeTruthy();

  const fs = await import('node:fs');
  const zipBuf = fs.readFileSync(path.resolve('tests/fixtures/mockups/valid-simple.zip'));

  const created = await request.post('/api/mockups', {
    headers: { cookie: `mk_session=${sess!.value}` },
    multipart: {
      name: 'HistoricMockup',
      build: { name: 'mockup.zip', mimeType: 'application/zip', buffer: zipBuf },
    },
  });
  expect(created.status()).toBe(201);
  const m = await created.json();

  // Upload v2 (new version) — this becomes current
  const v2 = await request.post(`/api/mockups/${m.id}/version`, {
    headers: { cookie: `mk_session=${sess!.value}` },
    multipart: {
      build: { name: 'mockup.zip', mimeType: 'application/zip', buffer: zipBuf },
    },
  });
  expect(v2.status()).toBe(201);

  // Open the viewer — orphan mockups (no projectId) live at
  // /projects/unsorted/<mockup-slug>. The 'unsorted' project is the
  // implicit bucket for mockups created without a projectId.
  await page.goto(`/projects/unsorted/${m.slug}`);
  await page.waitForSelector('iframe');

  // Capture the iframe src when viewing the current version. The viewer
  // payload bakes `?v=<currentVid>` in for cache-busting — record the full
  // src so we can compare it after switching to historic mode.
  const currentSrc = await page.locator('iframe').first().getAttribute('src');
  expect(currentSrc).toMatch(/\?v=/);

  // Open version popover — data-tooltip attribute value is "Versions & history"
  // (the &amp; in the JSX is the HTML encoding of the literal ampersand).
  // Playwright attribute selectors match the decoded value.
  await page.click('[data-tooltip="Versions & history"]');

  // Wait for the popover to appear (version list)
  await expect(page.locator('ul li').first()).toBeVisible();

  // Click the older (non-current) row — v1. The version label is in a .name
  // span; use has-text to avoid matching "v10", "v11", etc. if there are
  // ever more versions, but with exactly two versions this also works.
  // We target the li that is NOT aria-checked="true" (not current).
  const v1Row = page.locator('li[aria-checked="false"]').filter({ hasText: 'v1' });
  await v1Row.click();

  // URL must now contain ?v=
  await expect(page).toHaveURL(/\?v=/);

  // Banner visible: "Viewing v1" text and "Back to current version" button
  await expect(page.getByText(/Viewing v1/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Back to current version/i })).toBeVisible();

  // Iframe `src` must REPLACE the existing `v` param (single `?v=<historicVid>`),
  // not append a second one. The previous implementation used `appendQuery`,
  // which produced `?v=<currentVid>&v=<historicVid>` — and per the URL spec
  // `searchParams.get('v')` returns the FIRST value, so the iframe silently
  // served the current version while the banner said "Viewing v1". This
  // assertion catches that regression: there must be NO `&v=` in the src
  // (which would mean a duplicate `v` param), and the src must have changed
  // from the current-version src captured above.
  const historicSrc = await page.locator('iframe').first().getAttribute('src');
  expect(historicSrc).toMatch(/\?v=/);
  expect(historicSrc).not.toMatch(/&v=/);
  expect(historicSrc).not.toBe(currentSrc);

  // "+ New annotation" button must be gone in historic mode
  await expect(page.getByRole('button', { name: /New annotation/i })).toHaveCount(0);

  // ── Exit via banner button ──────────────────────────────────────────
  await page.getByRole('button', { name: /Back to current version/i }).click();

  // URL is canonical again (no ?v=), banner gone, add button returns
  await expect(page).not.toHaveURL(/\?v=/);
  await expect(page.getByText(/Viewing v1/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /New annotation/i })).toBeVisible();

  // ── Deep-link: re-enter via popover, reload, historic state survives ──
  await page.click('[data-tooltip="Versions & history"]');
  await expect(page.locator('ul li').first()).toBeVisible();
  await page.locator('li[aria-checked="false"]').filter({ hasText: 'v1' }).click();
  await expect(page).toHaveURL(/\?v=/);

  // Hard-reload — URL persists because router.replace wrote it into history
  await page.reload();
  await page.waitForSelector('iframe');
  await expect(page.getByText(/Viewing v1/i)).toBeVisible();

  // ── Exit by clicking the current row (v2) in the popover ──────────
  await page.click('[data-tooltip="Versions & history"]');
  await expect(page.locator('ul li').first()).toBeVisible();

  // v2 is the current row (aria-checked="true")
  const v2Row = page.locator('li[aria-checked="true"]').filter({ hasText: 'v2' });
  await v2Row.click();

  await expect(page).not.toHaveURL(/\?v=/);
});
