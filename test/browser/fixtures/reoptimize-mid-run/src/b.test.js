import { test } from 'vitest'

// still running when the re-optimization finishes
test('slow', async () => {
  await new Promise((resolve) => setTimeout(resolve, 1500))
})
