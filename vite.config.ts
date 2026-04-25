import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      thresholds: { statements: 95, functions: 100, branches: 85 },
      exclude: ['dist/**', 'bin/**'],
    },
  },
})
