import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { provider } from '../../settings.ts'

export default defineConfig({
  cacheDir: fileURLToPath(new URL('./node_modules/.vite', import.meta.url)),
  test: {
    env: {
      // a tester that cannot load fails at this timeout instead of 60s
      VITEST_BROWSER_IFRAME_TIMEOUT: '10000',
    },
    browser: {
      enabled: true,
      provider,
      instances: [{ browser: 'chromium' }],
    },
  },
})
