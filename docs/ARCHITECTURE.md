# Architecture

Read this first, together with [DATA_MODEL.md](./DATA_MODEL.md) and
[ROADMAP.md](./ROADMAP.md).

Warren is a fully client-side, parametric editor for 3D-printable modular rodent
tube networks. A user enters their cage dimensions, places and connects modules
(tubes, elbows, tees, platforms, cage mounts) in a 3D viewport, and exports the
network as printable parts (multi-STL plus an assembly manifest). There is no
backend for the MVP; the whole project state is serializable to JSON.

## The central principle: proxies vs real mesh

Three.js and OpenSCAD do NOT share geometry. This separation is the single most
important architectural decision (see [DECISIONS.md](./DECISIONS.md)).

- Three.js renders lightweight proxy meshes for fluid editing: simple cylinders,
  boxes, and oriented port markers. Cheap to move, snap, and re-render every
  frame.
- OpenSCAD (compiled to WASM) regenerates the real, printable mesh only on
  demand: HD preview and export. It runs in a Web Worker so the UI never blocks.
- The source of truth is neither renderer. It is a graph: `Module[]` plus
  `Connection[]` (see [DATA_MODEL.md](./DATA_MODEL.md)). Both renderers are
  projections of that graph.

Why: live boolean CAD per frame is too slow and too heavy (the OpenSCAD wasm
bundle alone is several MB and a render can take seconds). Proxies keep editing
at 60 fps; the expensive real geometry is computed only when the user asks to
preview or export.

## Layers

```
+-------------------------------------------------------------+
|  UI layer (Vue 3, <script setup>, TypeScript strict)        |
|  Palette, inspector, cage setup, export dialog, manifest    |
+-------------------------------------------------------------+
|  Editor / viewport layer (Three.js)                         |
|  Proxy meshes, TransformControls gizmo, raycast port pick,  |
|  snapping, selection. Reads/writes the graph store.         |
+-------------------------------------------------------------+
|  Domain / state layer (plain TypeScript, framework-free)    |
|  Module[] + Connection[] graph, invariants, snapping math,  |
|  serialization, auto-split planning. The source of truth.   |
+-------------------------------------------------------------+
|  Geometry engine layer (Web Workers)                        |
|  openscad-wasm: parametric module geometry -> STL           |
|  manifold-3d: booleans, validation, mesh <-> BufferGeometry |
+-------------------------------------------------------------+
```

Dependency rule: upper layers depend on lower layers, never the reverse. The
domain layer has no Vue and no Three.js imports, so it is unit-testable in
isolation (Vitest) and is where Phase 1 starts.

## Module boundaries (planned source layout)

This is the intended shape; it does not all exist yet (only the scaffold does).

```
src/
  domain/        graph types, invariants, serialization, snapping, split planner
  geometry/      worker clients + message contracts (openscad, manifold)
  workers/       the actual Web Worker entry points
  viewport/      Three.js scene, proxies, gizmo, picking
  ui/            Vue components (palette, inspector, dialogs)
  stores/        reactive state bridging domain <-> ui (Pinia or composables)
  assets/        static assets (logo, etc.)
```

The domain layer is deliberately the largest and the most thoroughly tested.

## The export flow (end to end)

1. Validate the graph: every `Connection` references two existing, compatible,
   currently-open ports; no port is double-connected; the network is a single
   connected component (or warn). See invariants in
   [DATA_MODEL.md](./DATA_MODEL.md).
2. For each module, generate its real mesh with openscad-wasm, parameterized by
   the module's parameters and the standardized connector geometry (see
   [CONNECTOR_SPEC.md](./CONNECTOR_SPEC.md)). Runs in the geometry worker.
3. Fuse/validate with manifold-3d where parts are meant to print as one piece;
   confirm each result is a valid manifold (`status()` OK, non-empty).
4. Auto-split: any part whose bounding box exceeds the usable print volume
   (default 250 mm cube, configurable) is cut into sub-parts. At each cut, a
   standard connector pair is added so the sub-parts rejoin after printing.
   `manifold-3d` `splitByPlane` / `trimByPlane` are the candidate primitives
   (see [research/manifold-3d.md](./research/manifold-3d.md)).
5. Emit a single 3MF holding every printable part with its assembly position, a
   per-part color, and the assembly manifest (which parts connect to which, in
   what order, with which connector, and any orientation/keying notes) in
   metadata. A fallback multi-STL export stays available. See DECISIONS.md
   ADR-0012.
6. Package: a downloadable bundle (the 3MF, or STLs + a JSON manifest for the
   fallback). The project JSON itself is separately saveable/loadable at any time.

Phases 4 to 6 in [ROADMAP.md](./ROADMAP.md) build this pipeline incrementally.

## Worker and threading notes

- openscad-wasm default build is single-threaded and does NOT require
  SharedArrayBuffer or COOP/COEP headers. A plain ES-module Web Worker is enough.
  See [research/openscad-wasm.md](./research/openscad-wasm.md).
- STL bytes (`Uint8Array`) are returned to the main thread as transferables to
  avoid copies.
- The wasm bundles are large (openscad ~7.5 MB), so they are lazy-loaded inside
  the worker on first preview/export, not at app startup.

## State and persistence

- The entire project is one serializable JSON document (schema in
  [DATA_MODEL.md](./DATA_MODEL.md)). Save/load is just JSON in/out for the MVP.
- No network, no accounts, no server. This keeps the MVP shippable as a static
  site and privacy-friendly.

## Open architectural questions

- Whether the geometry worker holds one long-lived openscad instance or
  re-instantiates per render (isolation vs warm-start cost). To be benchmarked
  in Phase 4.
- Whether platforms/large parts ever need a different printer profile than the
  default P1S box. The print box is already a setting to allow this.
- Reactive layer choice (Pinia vs plain composables) is deferred to Phase 2; the
  domain layer stays framework-free regardless.
