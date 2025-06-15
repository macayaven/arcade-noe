import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/**/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/build/**'],
    coverage: {
      enabled: true,
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/tests/**'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    },
    reporters: ['default']
  }
});
