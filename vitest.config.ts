import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: { reporter: ['text', 'lcov'] },
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
