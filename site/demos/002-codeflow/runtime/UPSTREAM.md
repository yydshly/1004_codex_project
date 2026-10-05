# Native CodeFlow runtime

This directory ships the actual CodeFlow application from commit
`b0e82d127fc4990f571ebc6da6c5d9af2591aaa1` of
[braedonsaunders/codeflow](https://github.com/braedonsaunders/codeflow/tree/b0e82d127fc4990f571ebc6da6c5d9af2591aaa1).
The original entry point, complete checked-in `vendor/` directory, and upstream
[MIT LICENSE](LICENSE) were copied from the fixed-commit archive. The dependencies
retain the license and metadata files shipped by the upstream repository.

The original `index.html` SHA-256 is
`8d8a3b83430da8f487a16b39fe239d0fcd46716a6dee2ea061425a5dc968e39d`.
The local changes are a `demo-bridge.js` script reference and one React hook call
inside `App`. The upstream parser, `runAnalysisData`, metrics, ten renderers,
styles, and native UI are retained. The original upstream metadata is also retained.

This is a real native application running on known example source files. It is
not a screenshot mockup or a hand-supplied graph. The bridge reads
`../fixtures/manifest.json`, fetches each actual source file, uses upstream
`Parser.extract` and `runAnalysisData`, and feeds their results into native React
state. No sample source code is executed. The sample supplies no Git history, so
native churn values are zero. These small-fixture demonstrations are not an
accuracy or performance benchmark for arbitrary repositories.

Native analysis drops full source content after extracting facts. Its normal
local-file UI reads the source again from the retained directory. This HTTP
adapter restores each file's exact fetched source into native `data.files`
after analysis, so the original Code cards and full-file preview can hydrate
without a browser directory handle. It does not invent function snippets or
change any renderer.

## Opening and control

Serve the research website over HTTP. Open `index.html?view=graph&theme=light` for
the independent full native UI. `file://` cannot use this bridge, because fixture
fetch and strict origin checks require an HTTP origin. The native application
retains its own GitHub and local-source controls.

Supported query parameters:

- `view`: `graph`, `code`, `graph3d`, `treemap`, `matrix`, `dendro`, `sankey`,
  `disjoint`, `bundle`, `architecture`.
- `layout`: `force`, `radial`, `hierarchical`, `grid`, `metro` (meaningful for
  Graph and Code; the other renderers use their native layouts).
- `color`: `folder`, `layer`, `churn` (each native renderer determines its support).
- `theme`: `light` or `dark`.

An embedded parent's command is:

```javascript
iframe.contentWindow.postMessage({
  type: 'codeflow-demo', action: 'view', view: 'matrix',
  layout: 'force', color: 'folder', theme: 'light',
  showLabels: true, autoRotate: false
}, location.origin);
```

Only messages from the direct parent with `event.origin === location.origin` are
accepted. The bridge does not accept caller-supplied graph data, source contents,
file URLs, or execution instructions. The manifest is restricted to 1–100 unique
relative file paths. Source URLs must remain within the same-origin
`fixtures/sample-project/` directory, without redirects, search parameters, or
fragments. The upstream file-size limit remains in force.

The runtime sends the parent:

```javascript
{
  type: 'codeflow-demo-state', event: 'state' | 'ready' | 'error',
  view: 'matrix', layout: 'force', color: 'folder',
  ready: true, analysisReady: true,
  files: 12, connections: 0, functions: 0, error: null
}
```

The example numbers above are schema examples; all reported counts come from
native `data.stats`. `analysisReady` means the native analyzer finished.
`ready` additionally requires a rendered element for the selected native view,
nonzero container dimensions, and two animation frames. Mermaid requires its
rendered SVG; the 3D view requires its WebGL canvas. This readiness check is not a
promise that a force simulation has converged or every feature was verified.
After 20 seconds without a visible native layout, the bridge reports an error.
Parents should check both `event.source === iframe.contentWindow` and the origin.

For read-only QA, the `<html>` element exposes `data-demo-ready`,
`data-demo-analysis-ready`, `data-demo-view`, `data-demo-files`,
`data-demo-connections`, `data-demo-functions`, and `data-demo-error`.

## Static validation

`demo-bridge.js` and the extracted native inline JavaScript passed `node --check`.
Browser checks are recorded by the research project separately. Upstream third
party files are preserved rather than rewritten or evaluated by the static check.
