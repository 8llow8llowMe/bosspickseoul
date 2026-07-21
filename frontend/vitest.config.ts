import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws at import time outside Next's build pipeline, which breaks
      // Vitest (plain Node). Point it at the package's own empty stub so imports resolve
      // as a no-op in tests only — this does NOT affect the production client-bundle
      // guard, which is enforced by Next's bundler, not this alias.
      'server-only': fileURLToPath(
        new URL('./node_modules/server-only/empty.js', import.meta.url),
      ),
    },
  },
})
