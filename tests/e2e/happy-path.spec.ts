import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Happy-path sanity check: authenticate → upload mockup → open viewer →
 * create comment-only annotation → resolve it via the kebab menu.
 *
 * Version promote/delete steps that previously lived here have been dropped:
 * they exercise gated VersionChip surfaces (Promote on non-current rows;
 * Delete behind `useCanDelete`) that are not part of the regular-user happy
 * path. Historic version viewing is covered by historic-viewing.spec.ts.
 *
 * Authentication is resilient to whether the shared dev-server DB has already
 * been seeded by an earlier spec (e.g. historic-viewing): /setup either
 * renders the first-run wizard (clean DB) or redirects to /login (dirty DB);
 * we detect which form is mounted and fill it accordingly.
 */
test('setup → upload → comment → resolve', async ({ page, request }) => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'longadminpassword42';

  // The e2e suite shares a single DB across files (workers: 1). On a clean
  // run the DB is empty and `/setup` renders the first-run wizard; on a
  // re-run against a dirty DB it redirects to `/login`. Drive whichever
  // form is mounted so the spec is order-independent with historic-viewing.
  await page.goto('/setup');
  await page.waitForLoadState('networkidle');
  if (/\/login(\?|$)/.test(page.url())) {
    // Setup already completed in a prior spec — sign in with the same
    // credentials historic-viewing seeded.
    await page.fill('input[type=email]', adminEmail);
    await page.fill('input[type=password]', adminPassword);
    await page.click('button[type=submit]');
  } else {
    // First-run wizard. Three inputs in order: Name, Email, Password.
    const nameInput = page.locator('input').nth(0);
    await nameInput.fill('Admin');
    await page.fill('input[type=email]', adminEmail);
    await page.fill('input[type=password]', adminPassword);
    await page.click('button[type=submit]');
  }
  await page.waitForURL(/localhost:3000\/?$/);
  await page.waitForLoadState('networkidle');

  // Upload via API using the authenticated cookie from the browser context.
  const cookies = await page.context().cookies();
  const sessCookie = cookies.find((c) => c.name === 'mk_session');
  expect(sessCookie).toBeTruthy();

  const zipPath = path.resolve('tests/fixtures/mockups/valid-simple.zip');
  const fs = await import('node:fs');
  const zipBuf = fs.readFileSync(zipPath);
  // The mockup name must be unique per the API's slug uniqueness contract;
  // when the shared DB carries state from a previous run, include a per-run
  // suffix so re-runs against a live dev server don't 409.
  const mockupName = `HappyPathMockup${Date.now()}`;
  const upload = await request.post('/api/mockups', {
    headers: { cookie: `mk_session=${sessCookie!.value}` },
    multipart: {
      // Name regex is `^[A-Za-z0-9_-]+$` — no spaces.
      name: mockupName,
      build: { name: 'mockup.zip', mimeType: 'application/zip', buffer: zipBuf },
    },
  });
  expect(upload.status()).toBe(201);
  const created = await upload.json();

  // Open the viewer. Orphan mockups (no projectId) live at
  // /projects/unsorted/<slug> — the 'unsorted' bucket for mockups created
  // without an explicit project. This matches the historic-viewing spec.
  await page.goto(`/projects/unsorted/${created.slug}`);
  await page.waitForSelector('iframe');

  // Comment-only annotation flow: open the draft, drop a pin by clicking the
  // mockup iframe, type the body, send. The draft card and rail use semantic
  // locators (aria-label, role) since the surfaces do not expose data-testid
  // attributes — see DraftCard.tsx ("Annotation body" Form.Label, "Send"
  // aria-label) and AnnotationsRail.tsx ("New annotation (…)" aria-label).
  await page.getByRole('button', { name: /new annotation/i }).click();
  await page
    .frameLocator('iframe[title="Mockup"]')
    .locator('body')
    .click({ position: { x: 20, y: 20 } });
  await page.getByRole('textbox', { name: /annotation body/i }).fill('e2e annotation body');
  await page.getByRole('button', { name: /^send$/i }).click();

  // The created annotation surfaces as an <li data-pin-target="..."> in the rail
  // (AnnotationCard root). Asserting visibility here confirms the create round
  // tripped through the API and rendered in the rail without navigating away.
  const annotationCard = page.locator('[data-pin-target]').first();
  await expect(annotationCard).toBeVisible();

  // Resolve via the primary kebab menu. The kebab button exposes
  // aria-label="Annotation actions"; opening it reveals a radiogroup of
  // status options where "Resolved" is a role="radio" button with
  // aria-label="Resolved". After picking it, the meta-row status pill
  // re-renders with the text "resolved".
  await annotationCard.getByRole('button', { name: /annotation actions/i }).click();
  await page.getByRole('radio', { name: /^resolved$/i }).click();
  await expect(annotationCard).toContainText(/resolved/i);
});
