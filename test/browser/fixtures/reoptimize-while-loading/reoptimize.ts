import type { Plugin, ViteDevServer } from 'vite'

/**
 * Makes Vite discover new dependencies at an exact point of the run and
 * waits until the optimizer has committed them.
 */
async function reoptimize(server: ViteDevServer) {
  const environment = server.environments.client
  const before = environment.depsOptimizer!.metadata.browserHash
  await environment.warmupRequest('/src/app.js')
  const deadline = Date.now() + 10_000
  while (environment.depsOptimizer!.metadata.browserHash === before) {
    if (Date.now() > deadline) {
      throw new Error('the dependency optimizer did not commit a new hash')
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

/**
 * Re-optimizes after the first tester HTML was served, before the tester
 * loads its first optimized dependency, so that request gets
 * `504 Outdated Optimize Dep`.
 */
export function reoptimizeWhileTesterLoads(): Plugin {
  let done = false
  return {
    name: 'reoptimize-while-tester-loads',
    configureServer(server) {
      server.middlewares.use(async (req, _res, next) => {
        const fromTester = !req.headers.referer?.includes('/__vitest_browser__/orchestrator')
        if (!done && fromTester && req.url?.includes('/deps/vitest')) {
          done = true
          await reoptimize(server)
        }
        next()
      })
    },
  }
}

/**
 * Re-optimizes when the tester requests `second.test.js`, before Vite
 * transforms it, so the test file imports a newer copy of the optimized
 * dependencies than the tester's runtime.
 */
export function reoptimizeWhileTestFileLoads(): Plugin {
  let done = false
  return {
    name: 'reoptimize-while-test-file-loads',
    configureServer(server) {
      server.middlewares.use(async (req, _res, next) => {
        if (!done && req.url?.split('?')[0].endsWith('/second.test.js')) {
          done = true
          await reoptimize(server)
        }
        next()
      })
    },
  }
}
