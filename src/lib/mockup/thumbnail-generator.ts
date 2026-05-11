import fs from 'node:fs';
import path from 'node:path';

export async function generateThumbnailFromBuildDir(buildDir: string): Promise<Buffer | null> {
  const indexPath = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexPath)) return null;

  try {
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      const fileUrl = `file://${path.resolve(indexPath)}`;
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 15_000 });
      const shot = await page.screenshot({ type: 'png' });
      return Buffer.from(shot);
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}
