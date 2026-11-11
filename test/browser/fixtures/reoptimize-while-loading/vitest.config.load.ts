import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { provider } from '../../settings.ts'
import { reoptimizeWhileTesterLoads } from './reoptimize.ts'

export default defineConfig({
  plugins: [reoptimizeWhileTesterLoads()],
  cacheDir: fileURLToPath(new URL('./node_modules/.vite-load', import.meta.url)),
  test: {
    // one tester at a time, so the fixture knows which tester it interrupts
    maxWorkers: 1,
    env: {
      VITEST_BROWSER_IFRAME_TIMEOUT: '10000',
    },
    browser: {
      enabled: true,
      provider,
      instances: [{ browser: 'chromium' }],
    },
  },
})
