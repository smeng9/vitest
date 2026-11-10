import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, DevEnvironment } from 'vite'
import type { ProjectBrowser } from './project'
import type { ParentBrowserProject } from './projectParent'
import crypto from 'node:crypto'
import { join } from 'pathe'
import { replacer } from './utils'

export async function resolveTester(
  globalServer: ParentBrowserProject,
  url: URL,
  res: ServerResponse<IncomingMessage>,
  next: Connect.NextFunction,
): Promise<string | undefined> {
  const csp = res.getHeader('Content-Security-Policy')
  if (typeof csp === 'string') {
    // add frame-ancestors to allow the iframe to be loaded by Vitest,
    // but keep the rest of the CSP
    res.setHeader(
      'Content-Security-Policy',
      csp.replace(/frame-ancestors [^;]+/, 'frame-ancestors *'),
    )
  }

  const sessionId = url.searchParams.get('sessionId')
  const session = sessionId && globalServer.vitest._browserSessions.getSession(sessionId)

  if (!session) {
    res.statusCode = 400
    res.end('Invalid session ID')
    return
  }

  const project = globalServer.vitest.getProjectByName(session.project.name || '')
  const browserProject =
    (project.browser as ProjectBrowser | undefined) || [...globalServer.children][0]

  if (!browserProject) {
    res.statusCode = 400
    res.end('Invalid session ID')
    return
  }

  const injectorJs: string =
    typeof globalServer.injectorJs === 'string'
      ? globalServer.injectorJs
      : await globalServer.injectorJs

  const injector = replacer(injectorJs, {
    __VITEST_PROVIDER__: JSON.stringify(browserProject.config.browser.provider?.name || 'preview'),
    __VITEST_CONFIG__: JSON.stringify(browserProject.wrapSerializedConfig()),
    __VITEST_VITE_CONFIG__: JSON.stringify({
      root: browserProject.vite.config.root,
    }),
    __VITEST_TYPE__: '"tester"',
    __VITEST_METHOD__: JSON.stringify('none'),
    __VITEST_SESSION_ID__: JSON.stringify(sessionId),
    __VITEST_OTEL_CARRIER__: JSON.stringify(null),
    __VITEST_TESTER_ID__: JSON.stringify(crypto.randomUUID()),
    __VITEST_PROVIDED_CONTEXT__: '{}',
    __VITEST_API_TOKEN__: JSON.stringify(globalServer.vitest.config.api.token),
  })

  try {
    browserProject.testerHtmlTransformed ??= (async () => {
      const testerHtml =
        typeof browserProject.testerHtml === 'string'
          ? browserProject.testerHtml
          : await browserProject.testerHtml
      const url = join('/@fs/', browserProject.testerFilepath)
      return await browserProject.vite.transformIndexHtml(url, testerHtml)
    })()
    const indexhtml = await browserProject.testerHtmlTransformed
    const html = replacer(indexhtml, {
      __VITEST_FAVICON__: globalServer.faviconUrl,
      __VITEST_INJECTOR__: injector,
    })
    const browserHash = await waitForDepsOptimizer(browserProject.vite.environments.client)
    return browserHash
      ? versionImmutableUrls(html, globalServer.immutablePrefixes, browserHash)
      : html
  } catch (err: any) {
    // don't cache a rejection — the next request should retry the transform
    browserProject.testerHtmlTransformed = undefined
    session.fail(err)
    next(err)
  }
}

/**
 * Waits until the dependency optimizer has no scan or re-optimization in
 * flight and returns the committed `browserHash`.
 *
 * `processing` of a discovered dependency resolves only after Vite has
 * committed the new metadata, so the hash returned here is the one Vite's
 * import analysis writes into files transformed from now on. Serving a tester
 * while a re-optimization is still running would hand it the old hash, and
 * Vite answers those imports with `504 Outdated Optimize Dep`.
 */
async function waitForDepsOptimizer(environment: DevEnvironment): Promise<string | undefined> {
  const optimizer = environment.depsOptimizer
  if (!optimizer) {
    return undefined
  }
  while (true) {
    await optimizer.scanProcessing
    const pending = Object.values(optimizer.metadata.discovered)
      .map((dep) => dep.processing)
      .filter((processing) => processing != null)
    if (!pending.length) {
      return optimizer.metadata.browserHash
    }
    // a failed optimization is reported by Vite, the tester still has to load
    await Promise.allSettled(pending)
  }
}

/**
 * Adds `?v=<browserHash>` to the tester's script and modulepreload URLs that
 * are served with `immutable` caching.
 *
 * Those files go through Vite's import analysis, which rewrites their imports
 * of optimized dependencies to `?v=<browserHash>` URLs, so their content
 * changes when the optimizer re-runs. Without a new URL the browser keeps
 * using the cached copy that points at the outdated dependencies. Vite gives
 * relative imports the `v` query of their importer, so versioning the entry
 * points is enough for the chunks they import.
 */
export function versionImmutableUrls(
  html: string,
  immutablePrefixes: string[],
  browserHash: string,
): string {
  if (!immutablePrefixes.length) {
    return html
  }
  return html.replace(
    /(<(?:script|link)\b[^>]*?\s(?:src|href)=")([^"?#]+)(")/g,
    (match, start: string, url: string, end: string) => {
      if (!immutablePrefixes.some((prefix) => url.startsWith(prefix))) {
        return match
      }
      return `${start}${url}?v=${browserHash}${end}`
    },
  )
}
