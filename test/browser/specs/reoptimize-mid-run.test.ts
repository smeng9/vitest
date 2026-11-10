import { rmSync } from 'node:fs'
import { resolve } from 'pathe'
import { expect, test } from 'vitest'
import { runBrowserTests } from './utils'

const root = resolve(import.meta.dirname, '../fixtures/reoptimize-mid-run')

test('testers created after a mid-run re-optimization load the new dependencies', async () => {
  // the re-optimization only happens when the optimizer cache is cold
  rmSync(resolve(root, 'node_modules/.vite'), { recursive: true, force: true })

  // several testers run at once, so some start after the re-optimization
  // while others are still running
  const { stderr, ctx } = await runBrowserTests({ root, maxWorkers: 4 })

  // the fixture's request for index.html does trigger the re-optimization
  expect(stderr).toContain('optimized dependencies changed. reloading')
  expect(stderr).not.toContain('did not become ready')

  const modules = ctx.state.getTestModules()
  expect(modules).toHaveLength(24)
  expect(modules.filter((module) => module.state() !== 'passed')).toEqual([])
})
