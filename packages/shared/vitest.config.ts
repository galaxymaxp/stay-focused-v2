import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Build output can retain tests for deliberately deleted source files.
  test: { include: ['src/**/*.test.ts'] },
});
