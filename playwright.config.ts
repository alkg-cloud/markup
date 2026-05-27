import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Boot a real Next dev server before the tests run. Skip if the operator
  // already has one running (the `E2E_BASE_URL` env var is the escape hatch
  // for hitting a remote target instead — when set, this block is ignored).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // mkdir up-front so the env validator's DATA_DIR `min(1)` check has a
      // writable target before any request lands on the upload routes.
      command: 'mkdir -p ./tmp/e2e-data && pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
        env: {
          AUTH_SECRET:
            process.env.AUTH_SECRET ?? 'e2e-only-stub-secret-not-for-prod-32chars',
          DATA_DIR: process.env.DATA_DIR ?? './tmp/e2e-data',
          DATABASE_URL: process.env.DATABASE_URL ?? 'file:./prisma/test.db',
        },
      },
});
