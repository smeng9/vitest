import type { Connect } from 'vite'
import type { ParentBrowserProject } from '../projectParent'
import c from 'tinyrainbow'

/**
 * Warns when a request made by a test is answered with an HTML page, either
 * the page itself or the `index.html` of Vite's SPA fallback for an unknown
 * path (an unmocked API call, for example).
 *
 * Vite pre-transforms the scripts of every HTML page it serves. When those
 * scripts import dependencies that no test file imports, the optimizer
 * discovers them during the run, re-optimizes and reloads the page, and the
 * only hint the user gets is the "Vite unexpectedly reloaded a test" warning,
 * which does not say where the dependencies came from.
 */
export function createHtmlResponseWarningMiddleware(
  browserServer: ParentBrowserProject,
): Connect.NextHandleFunction {
  const reported = new Set<string>()
  return function vitestHtmlResponseWarning(req, res, next) {
    const requestedUrl = req.url
    if (!requestedUrl || !isRequestFromTester(browserServer, req.headers.referer)) {
      return next()
    }
    res.once('finish', () => {
      const servedPath = req.url ? new URL(req.url, 'http://localhost').pathname : undefined
      const contentType = String(res.getHeader('content-type') ?? '')
      if (!servedPath?.endsWith('.html') || !contentType.startsWith('text/html')) {
        return
      }
      if (reported.has(requestedUrl)) {
        return
      }
      reported.add(requestedUrl)
      const requestedPath = new URL(requestedUrl, 'http://localhost').pathname
      const answer =
        requestedPath === servedPath
          ? `A test requested ${c.bold(servedPath)}.`
          : `A test requested ${c.bold(requestedPath)}, and Vite answered with ${c.bold(servedPath)} (SPA fallback).`
      browserServer.vitest.logger.warn(
        c.yellow(
          `\n${c.bold('[vitest]')} ${answer} ` +
            'Vite pre-transforms the scripts of that page, which can find dependencies that no test imports and re-optimize them while tests are running.\n' +
            `Mock the request, or add ${c.bold(`"${servedPath.slice(1)}"`)} to ${c.bold('`optimizeDeps.entries`')} so its dependencies are optimized before the tests start.\n`,
        ),
      )
    })
    next()
  }
}

function isRequestFromTester(browserServer: ParentBrowserProject, referer: string | undefined) {
  if (!referer) {
    return false
  }
  try {
    const url = new URL(referer)
    return url.pathname === browserServer.prefixTesterUrl && url.searchParams.has('sessionId')
  } catch {
    return false
  }
}
