import { expect, test } from 'vitest'

test('request served with the project index.html', async () => {
  // Vite serves the project's index.html and pre-transforms src/main.js,
  // which discovers new dependencies and re-optimizes during the run.
  // An unmocked request to an unknown path reaches the same index.html
  // through the SPA fallback.
  const response = await fetch('/index.html')
  expect(response.status).toBe(200)
})
