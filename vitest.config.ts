import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: { NODE_ENV: 'test' },
    globalSetup: ['tests/helpers/global-setup.ts'],
    // las pruebas de integración comparten la misma base de datos
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/persistence/migrate.ts', 'src/types/**'],
    },
  },
});
