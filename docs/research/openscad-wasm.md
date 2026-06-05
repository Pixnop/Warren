# Research: openscad-wasm

Status: researched 2026-06-06. Re-verify before relying on version-specific details.

OpenSCAD compiled to WebAssembly. Warren uses it as the real parametric
geometry generator and STL exporter (not for live editing; see
[ARCHITECTURE.md](../ARCHITECTURE.md)).

## Project state and version

- Official repository: `openscad/openscad-wasm` (under the OpenSCAD GitHub org).
  It originated as David Schroer's (`DSchroer`) project and was adopted into
  the org. The OpenSCAD Playground still credits the DSchroer WASM build.
- Latest tagged release: `2022.03.20`. There has been no newer tagged release
  since March 2022.
- The `main` branch is still maintained despite stale release tags. Most recent
  commits seen were Dec 2025 (build-process and fontconfig updates). For a
  current build you likely need to build from `main` (Docker + Deno + Make)
  rather than rely on the 2022 release artifacts.
- There is NO official npm package. Distribution is GitHub Release artifacts:
  `openscad.js`, `openscad.wasm`, `openscad.wasm.js`, plus optional
  `openscad.fonts.js` and `openscad.mcad.js`, with `.d.ts` typings.
- Unofficial npm wrappers exist (`openscad-wasm` by `20lives`,
  `openscad-wasm-prebuilt`, `@bascanada/openscad-compiler`). Treat all as
  community-maintained; verify provenance before depending on one.

Implication for Warren: we vendor the artifacts into `public/wasm/` (or build
from `main`) rather than `pnpm add` an official package. This is recorded as a
decision in [DECISIONS.md](../DECISIONS.md). The `.gitignore` already excludes
`public/wasm/openscad*` so the large binaries are not committed.

## Minimal initialization (confirmed from the official README)

It is an ES module wrapping an Emscripten `Module` factory (async, returns a
Promise).

```js
import OpenSCAD from './openscad.js'
// Optional asset loaders that populate the virtual filesystem:
import { addFonts } from './openscad.fonts.js'
import { addMCAD } from './openscad.mcad.js'

// 1. Instantiate. noInitialRun lets us stage files before running main().
const instance = await OpenSCAD({ noInitialRun: true })

// 2. Write the .scad source into the in-memory filesystem (MEMFS, mounted at /).
instance.FS.writeFile('/input.scad', 'cube(10);')

// 3. Run it like the CLI. Output format is inferred from the -o extension.
instance.callMain(['/input.scad', '--enable=manifold', '-o', 'out.stl'])

// 4. Read the STL back as bytes (Uint8Array).
const stl = instance.FS.readFile('/out.stl')
```

Confirmed API facts:

- Factory: `await OpenSCAD({ noInitialRun: true })`.
- `instance.FS` is the standard Emscripten FS object. MEMFS is mounted at `/`
  by default (in-browser, in-memory, lost on reload).
- `instance.callMain([...args])` runs OpenSCAD's CLI `main`. Args are exactly
  the OpenSCAD command-line flags.
- Output is read back via `instance.FS.readFile(path)` returning a `Uint8Array`.
- All `include`/`use` dependencies must be written into the FS before
  `callMain`. Errors print to the Emscripten `print`/`printErr` callbacks
  rather than throwing.

## Geometry backend: Manifold is compiled in

OpenSCAD's Manifold geometry engine is compiled into the wasm binary (it is
part of OpenSCAD itself). You enable it at runtime with the CLI flag
`--enable=manifold`. It is NOT the separate `manifold-3d` npm package. The
default engine is CGAL; Manifold is opt-in and substantially faster. The
OpenSCAD Playground defaults to Manifold.

Warren should pass `--enable=manifold` on every render for speed.

## Performance and limitations

- Single-threaded by default (the repo Makefile sets `PTHREAD ::= 0`). The
  standard published build does NOT require SharedArrayBuffer, so no COOP/COEP
  cross-origin-isolation headers are needed. Those only become mandatory if you
  build the opt-in `PTHREAD=1` threaded variant.
- Render-time benchmarks: none are officially published. Qualitatively, CGAL is
  slow and `--enable=manifold` is fast. Do not assume specific numbers; measure.
- Memory: bounded by the wasm32 4 GB address space and whatever maximum-memory
  the build sets (the exact cap was not confirmable from the repo). Treat large
  or highly-faceted models as a memory risk and test.
- Fonts (`text()`) need the optional `openscad.fonts.js` (~7.8 MB) loaded into
  the FS. MCAD library needs `openscad.mcad.js` (~0.5 MB).

## Web Worker usage

- Recommended in practice. `callMain` is synchronous and CPU-heavy, so running
  OpenSCAD in a Web Worker keeps the UI responsive. The official example runs
  on the main thread; the worker harness is a pattern you implement, not a
  documented API.
- Because the default build is single-threaded, an ordinary Worker works with
  no special headers.
- Return the STL as a transferable to avoid a copy:
  ```js
  // inside the worker
  const bytes = instance.FS.readFile('/out.stl') // Uint8Array
  postMessage({ stl: bytes }, [bytes.buffer]) // transfer the ArrayBuffer
  ```

## Bundle size (2022.03.20 release assets)

- `openscad.wasm` ~ 7.4 MB
- `openscad.wasm.js` ~ 0.1 MB
- `openscad.fonts.js` ~ 7.8 MB (optional)
- `openscad.mcad.js` ~ 0.5 MB (optional)

A bare render setup is ~7.5 MB; with fonts ~15 MB. Lazy-load it (ideally in the
worker), serve compressed (gzip/brotli), and cache aggressively. A fresh build
from `main` may differ in size.

## Open questions to resolve before Phase 4

- Decide: vendor the 2022 release artifacts vs build a fresh wasm from `main`.
  A fresh build gets the current Manifold engine and bugfixes but adds build
  toolchain (Docker/Deno) work.
- Confirm whether `text()` / fonts are needed (probably not for tube geometry).
  If not, skip the 7.8 MB fonts asset.
- Benchmark a representative module (for example a tee with connectors) to get
  real render times for the preview/export UX budget.

## Sources

- https://github.com/openscad/openscad-wasm (official repo, README with the
  usage example)
- https://github.com/openscad/openscad-wasm/releases (release tags; latest
  `2022.03.20`)
- https://github.com/openscad/openscad-wasm/blob/main/Makefile (`PTHREAD ::= 0`)
- https://github.com/openscad/openscad-playground (Manifold default, DSchroer
  attribution, PWA/offline caching)
- https://emscripten.org/docs/api_reference/Filesystem-API.html (MEMFS/NODEFS)
- https://web.dev/articles/webassembly-threads (COOP/COEP + SharedArrayBuffer
  requirements for threaded wasm)
