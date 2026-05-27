import path from 'node:path';
import { defineConfig } from 'vitest/config';

// `server-only` is a marker that Next aliases to a no-op under its
// `react-server` bundling condition. Vitest doesn't run that condition,
// so we alias the package to its `empty.js` (the same file Next picks)
// to make `import 'server-only'` inert in tests.
const serverOnlyEmpty = path.resolve(__dirname, 'node_modules/server-only/empty.js');

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.tsx',
        'src/styles/**',
        'src/types/**',
        'src/instrumentation.ts',
        'src/proxy.ts',
        'src/app/**/layout.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
      ],
    },
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    // CI runners have slower disks than dev workstations; integration
    // tests that upload + unzip mockup fixtures can brush past the
    // default 5s. 10s covers the slowest CI runs without masking real
    // hangs.
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': serverOnlyEmpty,
    },
  },
});
