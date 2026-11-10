import { test } from 'vitest'

// testers for these files are created after the re-optimization
test('fast', async () => {
  await new Promise((resolve) => setTimeout(resolve, 200))
})
