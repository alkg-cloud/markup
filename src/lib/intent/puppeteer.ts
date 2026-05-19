import 'server-only';

import puppeteer, { type Browser, type Page } from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;

async function launch(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launch().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  const browser = await browserPromise;
  // Auto-recover if browser disconnected
  if (!browser.connected) {
    browserPromise = launch();
    return browserPromise;
  }
  return browser;
}

export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    try {
      await page.close();
    } catch {
      // ignore — page may already be closed
    }
  }
}

export async function closeBrowser(): Promise<void> {
  const p = browserPromise;
  browserPromise = null;
  if (p) {
    try {
      const browser = await p;
      await browser.close();
    } catch {
      // ignore
    }
  }
}
