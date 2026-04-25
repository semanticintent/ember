import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      thresholds: { statements: 90, functions: 95, branches: 85 },
      exclude: ['dist/**', 'bin/**', 'src/index.ts', 'src/cli.ts'],
    },
  },
})
