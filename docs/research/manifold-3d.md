# Research: manifold-3d

Status: researched 2026-06-06. Re-verify before relying on version-specific details.

The Manifold geometry engine (Emmett Lalish, `elalish/manifold`), WASM build
published on npm as `manifold-3d`. Warren uses it client-side for fast boolean
operations, mesh validation (guaranteed-manifold output), and as the bridge
between generated geometry and Three.js `BufferGeometry`. See
[ARCHITECTURE.md](../ARCHITECTURE.md).

## Project state and version

- Latest npm version: `3.5.1`, published 2026-06-04 (verified from the npm
  registry).
- Maintainers: `pca006132` and `elalish` (Emmett Lalish, the author).
- Repo `github.com/elalish/manifold`, Apache-2.0, active (repo and npm both
  updated within ~1 day of the research date).
- A separate Python package `manifold3d` exists on PyPI (note the missing
  hyphen). We use the JS/WASM `manifold-3d`.

## Minimal initialization (confirmed from the official three.js example)

Import the default `Module` factory, await it, call `setup()`, then destructure
the classes you need.

```ts
import Module from 'manifold-3d'

const wasm = await Module() // module factory returns a Promise
wasm.setup() // REQUIRED before any use
const { Manifold, Mesh } = wasm

// OpenSCAD-inspired primitive constructors:
const box = Manifold.cube([1, 1, 1], true) // size vec3, center = true
const ball = Manifold.sphere(0.5, 32) // radius, circularSegments
```

`setup()` must be called once after the factory resolves.

Bundler note: some bundlers need the wasm handled specially. Warren's
`vite.config.ts` already lists `manifold-3d` under `optimizeDeps.exclude` so
Vite does not try to pre-bundle the binary. If WASM loading fails, see the
upstream discussions referenced in Sources.

## Boolean operations (confirmed)

Both instance and static forms exist.

- Instance: `a.add(b)` (union), `a.subtract(b)` (difference),
  `a.intersect(b)` (intersection).
- Static, also accept an array for batch:
  - `Manifold.union(a, b)` / `Manifold.union(list)`
  - `Manifold.difference(a, b)` / `Manifold.difference(list)`
  - `Manifold.intersection(a, b)` / `Manifold.intersection(list)`

Related ops confirmed in the docs: `split`, `splitByPlane`, `trimByPlane`,
`minkowskiSum`, `minkowskiDifference`. `trimByPlane` / `splitByPlane` are
directly relevant to Warren's auto-split feature (Phase 5).

## Mesh import and export (confirmed)

Out of a Manifold: `manifold.getMesh()` returns a `Mesh` (the JS-friendly
MeshGL wrapper). Key fields:

- `vertProperties`: flat interleaved vertex buffer, `Float32Array`. First 3
  props per vertex are position x, y, z.
- `numProp`: properties per vertex (3 = position only).
- `triVerts`: triangle index buffer, `Uint32Array`, stride 3.
- `runIndex`, `runOriginalID`, `numRun`: triangle "runs" (like draw calls /
  material groups); `runOriginalID` maps a run back to an original input ID.
- `mergeFromVert` / `mergeToVert`: vertex-merge vectors used to reconstruct
  manifoldness from GL-duplicated verts.

Into a Manifold: construct a `Mesh({ numProp, vertProperties, triVerts, ... })`,
optionally call `mesh.merge()` (welds near-identical positions), then
`new Manifold(mesh)` or `Manifold.ofMesh(mesh)`. If the input is not an oriented
2-manifold you get an empty Manifold with an error status (see Validation).

## Three.js interop (confirmed, official example exists)

Official example: live at https://manifoldcad.org/three.html, source at
`bindings/wasm/examples/three/three.ts`.

Manifold Mesh to `THREE.BufferGeometry`:

```ts
function mesh2geometry(mesh) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(mesh.vertProperties, 3))
  geometry.setIndex(new BufferAttribute(mesh.triVerts, 1))
  // iterate mesh.numRun / runIndex / runOriginalID -> geometry.addGroup() per material
  return geometry
}
```

`THREE.BufferGeometry` to Manifold Mesh:

```ts
function geometry2mesh(geometry) {
  const vertProperties = geometry.attributes.position.array // Float32Array
  const triVerts =
    geometry.index != null
      ? geometry.index.array // Uint32Array
      : new Uint32Array(vertProperties.length / 3).map((_, i) => i)
  const mesh = new Mesh({ numProp: 3, vertProperties, triVerts, runIndex, runOriginalID })
  mesh.merge() // weld GL-duplicated verts so the result is manifold
  return mesh
}
```

Key mappings: `vertProperties` <-> `position` attribute (itemSize 3);
`triVerts` <-> index (itemSize 1); Manifold triangle runs <-> three.js geometry
groups (materials), tracked via `runOriginalID` and `Manifold.reserveIDs(n)`.

## Validation and manifoldness (confirmed)

- All operations produce manifold output by construction (the headline
  guarantee).
- On import, building a Manifold from a non-2-manifold mesh returns an empty
  Manifold and sets an error status.
- Error API: `manifold.status()` returns an error reason; `manifold.isEmpty()`
  tests for empty geometry. Error status propagates through operations.
- Topology: `manifold.genus()` (handle count; meaningful for a single connected
  mesh, run `decompose()` first if needed), plus `numVert()`, `numTri()`.
- Repair: `Mesh.merge()` welds GL-duplicated verts; badly broken meshes need
  external repair.

Warren uses these as the export gate: a part is exportable only if its Manifold
is non-empty, `status()` is OK, and (for closed tube parts) the topology is
sane. See [ROADMAP.md](../ROADMAP.md) Phase 6.

## Relationship to OpenSCAD

Manifold is integrated into OpenSCAD as a selectable geometry backend and, as
of the 2024.09.28 nightly, is no longer experimental. CGAL was still the
documented default at the time of research; Manifold is chosen via
`--backend=manifold` (or `--enable=manifold` in the wasm CLI). Do not assume it
is the default for a given OpenSCAD version; verify per release.

Practical note for Warren: the same engine runs twice in our stack, once inside
openscad-wasm (geometry generation) and once as standalone `manifold-3d`
(client-side booleans/validation). That is intentional, see
[DECISIONS.md](../DECISIONS.md).

## Uncertain / to verify

- Exact optional-argument signatures (for example `getMesh(normalIdx?)`) come
  from the rendered docs page, not source. Double-check against the bundled
  `.d.ts` in the installed 3.5.1 package before relying on them.
- Whether Manifold is the default OpenSCAD backend in the version we end up
  vendoring.

## Sources

- https://www.npmjs.com/package/manifold-3d (version 3.5.1, maintainers)
- https://github.com/elalish/manifold (repo, license, activity)
- https://github.com/elalish/manifold/blob/master/bindings/wasm/examples/three/three.ts
  (official three.js interop: init, boolean ops, Mesh <-> BufferGeometry)
- https://manifoldcad.org/three.html (live official three.js example)
- https://manifoldcad.org/docs/jsuser/classes/Manifold.html (JS API: booleans,
  getMesh/ofMesh, genus/numVert/numTri, status/isEmpty, primitives)
- https://github.com/elalish/manifold/blob/master/README.md (manifold guarantee,
  import error status, OpenSCAD-inspired API)
