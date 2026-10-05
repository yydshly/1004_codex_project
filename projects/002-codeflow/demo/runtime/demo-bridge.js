/* Research adapter for the pinned, unmodified CodeFlow analyzer and renderers.
 * The iframe accepts commands only from its direct same-origin parent.
 * It reads actual, shipped fixture source files; no graph is supplied by the parent.
 */
(function () {
  'use strict';
  var VIEWS = ['graph', 'code', 'graph3d', 'treemap', 'matrix', 'dendro', 'sankey', 'disjoint', 'bundle', 'architecture'];
  var LAYOUTS = ['force', 'radial', 'hierarchical', 'grid', 'metro'];
  var COLORS = ['folder', 'layer', 'churn'];

  function sameOriginHttp() {
    return /^https?:$/.test(window.location.protocol) && window.location.origin !== 'null';
  }

  window.CodeflowDemoBridge = {
    useBridge: function (options) {
      var current = React.useRef(options);
      current.current = options;
      var analysisDone = React.useRef(false);
      var layoutDone = React.useRef(false);
      var bridgeError = React.useRef(null);
      var mounted = React.useRef(true);

      function report(event, error) {
        var state = current.current;
        var stats = state.data && state.data.stats || {};
        var message = {
          type: 'codeflow-demo-state',
          event: event,
          view: state.graphConfig.vizType,
          layout: state.graphConfig.viewMode,
          color: state.colorMode,
          ready: analysisDone.current && layoutDone.current && !!state.data,
          analysisReady: analysisDone.current && !!state.data,
          files: Number(stats.files || 0),
          connections: Number(stats.connections || 0),
          functions: Number(stats.functions || 0),
          error: error || bridgeError.current || state.error || null
        };
        window.CODEFLOW_DEMO_STATE = message;
        document.documentElement.dataset.demoReady = String(message.ready);
        document.documentElement.dataset.demoView = message.view;
        document.documentElement.dataset.demoAnalysisReady = String(message.analysisReady);
        document.documentElement.dataset.demoFiles = String(message.files);
        document.documentElement.dataset.demoConnections = String(message.connections);
        document.documentElement.dataset.demoFunctions = String(message.functions);
        document.documentElement.dataset.demoError = message.error || '';
        if (sameOriginHttp() && window.parent !== window) {
          window.parent.postMessage(message, window.location.origin);
        }
      }

      function applyCommand(command) {
        var api = current.current;
        if (!command || command.type !== 'codeflow-demo' || command.action !== 'view') return;
        if (VIEWS.indexOf(command.view) < 0) {
          report('error', 'Unsupported visualization: ' + String(command.view));
          return;
        }
        if (command.layout !== undefined && LAYOUTS.indexOf(command.layout) < 0) {
          report('error', 'Unsupported layout: ' + String(command.layout));
          return;
        }
        if (command.color !== undefined && COLORS.indexOf(command.color) < 0) {
          report('error', 'Unsupported color mode: ' + String(command.color));
          return;
        }
        if (command.view === 'graph3d' && typeof window.ForceGraph3D !== 'function') {
          report('error', 'The upstream 3D renderer could not load.');
          return;
        }
        api.setGraphConfig(function (previous) {
          var next = Object.assign({}, previous, { vizType: command.view });
          if (command.layout !== undefined) next.viewMode = command.layout;
          if (typeof command.showLabels === 'boolean') next.showLabels = command.showLabels;
          if (typeof command.autoRotate === 'boolean') next.autoRotate = command.autoRotate;
          return next;
        });
        if (command.color !== undefined) api.setColorMode(command.color);
        if (command.theme === 'light' || command.theme === 'dark') api.setTheme(command.theme);
        api.setSelected(null);
        api.setBlastRadius(null);
        api.setFolderFilter(null);
        bridgeError.current = null;
      }

      React.useEffect(function () {
        mounted.current = true;
        function handleMessage(event) {
          if (!sameOriginHttp() || event.origin !== window.location.origin || event.source !== window.parent) return;
          applyCommand(event.data);
        }
        window.addEventListener('message', handleMessage);
        var parameters = new URLSearchParams(window.location.search);
        applyCommand({
          type: 'codeflow-demo', action: 'view', view: parameters.get('view') || 'graph',
          layout: parameters.get('layout') || undefined,
          color: parameters.get('color') || undefined,
          theme: parameters.get('theme') || 'light'
        });
        report('state');

        async function loadFixture() {
          var api = current.current;
          if (!sameOriginHttp()) throw new Error('Serve the demo over local HTTP to load the actual fixture source files.');
          api.setLoading(true);
          api.setError(null);
          api.setProgress('Reading known sample-project source files...');
          var manifestUrl = new URL('../fixtures/manifest.json', window.location.href);
          var fixtureBase = new URL('./', manifestUrl);
          var sampleBase = new URL('./sample-project/', fixtureBase);
          var response = await fetch(manifestUrl.href, { credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
          if (!response.ok) throw new Error('Fixture manifest HTTP ' + response.status);
          var manifest = await response.json();
          if (!manifest || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 100) {
            throw new Error('Fixture manifest must contain 1–100 source files.');
          }
          var seen = new Set();
          var fileRecords = await Promise.all(manifest.files.map(async function (entry) {
            if (!entry || typeof entry.path !== 'string' || typeof entry.url !== 'string' ||
                !entry.path || /(^\/|\\|(^|\/)\.\.(\/|$)|[?#])/.test(entry.path) || seen.has(entry.path)) {
              throw new Error('Invalid or duplicate fixture path.');
            }
            seen.add(entry.path);
            var sourceUrl = new URL(entry.url, fixtureBase);
            if (sourceUrl.origin !== window.location.origin || !sourceUrl.href.startsWith(sampleBase.href) || sourceUrl.search || sourceUrl.hash) {
              throw new Error('Fixture source must remain inside the same-origin sample-project directory.');
            }
            var sourceResponse = await fetch(sourceUrl.href, { credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
            if (!sourceResponse.ok) throw new Error(entry.path + ': HTTP ' + sourceResponse.status);
            var content = await sourceResponse.text();
            var parts = entry.path.split('/');
            var name = parts.pop();
            var size = new TextEncoder().encode(content).byteLength;
            if (api.Parser.isOversized(size)) throw new Error(entry.path + ' exceeds the upstream file limit.');
            return { path: entry.path, name: name, folder: parts.join('/') || 'root', content: content, size: size };
          }));
          if (!mounted.current) return;
          await api.Parser.initTreeSitter();
          var allFunctions = [];
          var analyzed = fileRecords.map(function (file) {
            var isCode = api.Parser.isCode(file.name) &&
              (!api.Parser.isScriptContainer(file.path) || api.Parser.hasEmbeddedCode(file.content, file.path));
            var layer = api.Parser.detectLayer(file.path);
            var functions = isCode ? api.Parser.extract(file.content, file.path) : [];
            functions.forEach(function (fn) {
              allFunctions.push(Object.assign({}, fn, { folder: file.folder, layer: layer }));
            });
            return Object.assign({}, file, {
              functions: functions, lines: file.content.split('\n').length, layer: layer, churn: 0, isCode: isCode
            });
          });
          var data = await api.runAnalysisData({
            analyzed: analyzed, allFns: allFunctions, excludePatterns: [],
            progress: api.setProgress, yieldFn: api.yieldToBrowser
          });
          if (!mounted.current) return;
          // Native analysis intentionally drops full content after extracting
          // facts. Normal local UI hydrates it from a retained directory handle.
          // This HTTP fixture adapter hydrates the exact fetched source instead;
          // the analyzer output and native code renderer remain unchanged.
          var sourceByPath = new Map(fileRecords.map(function (file) { return [file.path, file.content]; }));
          data.files = data.files.map(function (file) {
            return Object.assign({}, file, { content: sourceByPath.get(file.path) });
          });
          api.setRepoInfo({ owner: 'local', repo: 'sample-project', name: manifest.name || 'Known source fixture' });
          api.setLocalSourceKind('folder');
          api.setExpandedPaths(new Set(['', 'src']));
          api.setCachedFromId(null);
          api.setData(data);
          api.setLoading(false);
          analysisDone.current = true;
        }

        loadFixture().catch(function (error) {
          if (!mounted.current) return;
          bridgeError.current = error && error.message || String(error);
          current.current.setError(bridgeError.current);
          current.current.setLoading(false);
          report('error', bridgeError.current);
        });
        return function () {
          mounted.current = false;
          window.removeEventListener('message', handleMessage);
        };
      }, []);

      React.useEffect(function () {
        layoutDone.current = false;
        report('state');
        if (!analysisDone.current || !options.data) return;
        var disposed = false;
        var timer;
        var deadline = Date.now() + 20000;
        var selectors = {
          graph: '.canvas-area > svg .nc', code: '.code-canvas .code-card-source .file-preview-line',
          graph3d: '.graph3d-container canvas', treemap: '.treemap-rect',
          matrix: '.matrix-cell-rect', dendro: '.dendro-node',
          sankey: '.sankey-link', disjoint: '.disjoint-node',
          bundle: '.bundle-node', architecture: '.mermaid-render svg'
        };
        var view = options.graphConfig.vizType;
        function checkLayout() {
          if (disposed) return;
          var element = document.querySelector(selectors[view]);
          var container = element && (view === 'graph3d' || view === 'architecture' ? element : element.closest('svg, .code-canvas'));
          var bounds = container && container.getBoundingClientRect();
          if (element && bounds && bounds.width > 0 && bounds.height > 0) {
            // A second frame lets native D3 ticks / WebGL / Mermaid paint.
            requestAnimationFrame(function () {
              if (disposed) return;
              requestAnimationFrame(function () {
                if (disposed) return;
                layoutDone.current = true;
                report('ready');
              });
            });
          } else if (Date.now() >= deadline) {
            bridgeError.current = 'The native ' + view + ' view did not produce a visible layout within 20 seconds.';
            report('error', bridgeError.current);
          } else {
            timer = setTimeout(checkLayout, 50);
          }
        }
        timer = setTimeout(checkLayout, 0);
        return function () { disposed = true; clearTimeout(timer); };
      }, [options.data, options.graphConfig.vizType, options.graphConfig.viewMode, options.colorMode, options.error]);
    }
  };
})();
