import { rmSync } from 'node:fs'
import { resolve } from 'pathe'
import { expect, test } from 'vitest'
import { runBrowserTests } from './utils'

const root = resolve(import.meta.dirname, '../fixtures/reoptimize-while-loading')

test.for([
  {
    // https://github.com/vitest-dev/vitest/issues/11937
    name: 'a tester whose dependencies are outdated before it finishes loading',
    config: 'vitest.config.load.ts',
  },
  {
    // https://github.com/vitest-dev/vitest/issues/10775
    name: 'a test file transformed after the tester loaded its dependencies',
    config: 'vitest.config.import.ts',
  },
])('re-optimization reaches $name: the file runs in a new tester', async ({ config }) => {
  // the fixture triggers the re-optimization itself, on a cold optimizer cache
  rmSync(resolve(root, 'node_modules'), { recursive: true, force: true })

  const { stderr, ctx } = await runBrowserTests({ root, config: resolve(root, config) })

  expect(stderr).toContain('optimized dependencies changed. reloading')
  expect(stderr).not.toContain('did not become ready')
  expect(stderr).not.toContain('failed to find the current suite')

  const modules = ctx.state.getTestModules()
  expect(modules.map((module) => module.moduleId).sort()).toEqual([
    resolve(root, 'src/first.test.js'),
    resolve(root, 'src/second.test.js'),
  ])
  expect(modules.filter((module) => module.state() !== 'passed')).toEqual([])
})
