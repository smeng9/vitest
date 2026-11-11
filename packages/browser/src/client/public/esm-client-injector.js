(() => {
  function wrapModule(moduleCallback) {
    if (typeof moduleCallback !== "function") {
      return moduleCallback
    }

    if (typeof __vitest_mocker__ === "undefined" || typeof __vitest_worker__ === 'undefined') {
      return moduleCallback()
    }

    const { evaluatedModules } = __vitest_worker__
    const moduleId = `${Math.random()}`
    const viteModule = evaluatedModules.ensureModule(moduleId, moduleId)

    viteModule.evaluated = false
    viteModule.promise = __vitest_mocker__.prepare().then(() => moduleCallback())
    return viteModule.promise.finally(() => {
      viteModule.evaluated = true
      viteModule.promise = undefined

      evaluatedModules.idToModuleMap.delete(viteModule.id)
      evaluatedModules.fileToModulesMap.delete(viteModule.file)
      evaluatedModules.urlToIdModuleMap.delete(viteModule.url)
    });
  }

  window.__vitest_browser_runner__ = {
    wrapModule,
    wrapDynamicImport: wrapModule,
    disposeExceptionTracker: () => {},
    cleanups: [],
    config: { __VITEST_CONFIG__ },
    viteConfig: { __VITEST_VITE_CONFIG__ },
    type: { __VITEST_TYPE__ },
    sessionId: { __VITEST_SESSION_ID__ },
    testerId: { __VITEST_TESTER_ID__ },
    otelCarrier: { __VITEST_OTEL_CARRIER__ },
    provider: { __VITEST_PROVIDER__ },
    method: { __VITEST_METHOD__ },
    providedContext: { __VITEST_PROVIDED_CONTEXT__ },
    depsHash: { __VITEST_DEPS_HASH__ },
  };
  window.VITEST_API_TOKEN = { __VITEST_API_TOKEN__ };

  // A module script that fails to load (for example a `504 Outdated Optimize Dep`
  // after Vite re-optimized dependencies) never runs, so the tester would never
  // report "ready". This script runs before the module scripts, so it can tell
  // the orchestrator, which recreates the tester or fails the file right away.
  if (__vitest_browser_runner__.type === 'tester' && window.self !== window.top) {
    const channel = new BroadcastChannel(`vitest:${__vitest_browser_runner__.sessionId}`);
    const iframeId = new URL(location.href).searchParams.get('iframeId');
    window.addEventListener('error', (event) => {
      const target = event.target;
      if (target instanceof HTMLScriptElement && target.type === 'module') {
        channel.postMessage({ event: 'load-error', iframeId, href: location.href, url: target.src });
      }
    }, true);
  }

  const config = __vitest_browser_runner__.config;

  if (config.testNamePattern)
    config.testNamePattern = parseRegexp(config.testNamePattern);

  if (config.retry?.condition)
    config.retry.condition = parseRegexp(config.retry.condition);

  function parseRegexp(input) {
    // Parse input
    const m = input.match(/(\/?)(.+)\1([a-z]*)/i);

    // match nothing
    if (!m) return /$^/;

    // Invalid flags
    if (m[3] && !/^(?!.*?(.).*?\1)[gmixXsuUAJ]+$/.test(m[3]))
      return RegExp(input);

    // Create the regular expression
    return new RegExp(m[2], m[3]);
  }
})();
