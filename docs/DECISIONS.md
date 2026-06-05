# Decisions (lightweight ADR log)

Append a new entry when a non-obvious technical choice is made. Keep each short:
context, decision, consequences. Newest at the bottom. Do not rewrite history;
add a superseding entry instead.

## ADR-0001: OpenSCAD-WASM as the real geometry engine

Date: 2026-06-06. Status: accepted.

Context: Warren needs real, parametric, watertight printable geometry and STL
export, fully client-side. Options considered: hand-built mesh generation in JS,
a CSG library in JS, or a real parametric kernel compiled to WASM.

Decision: use openscad-wasm to generate module geometry and STL, driven by
parametric `.scad` definitions per module type.

Consequences: we get a real, proven parametric CAD kernel and OpenSCAD's modeling
language for free. Cost: a large wasm bundle (~7.5 MB) and second-scale render
times, so it cannot run per frame (see ADR-0002). Run it in a Web Worker with
`--enable=manifold` for speed. See
[research/openscad-wasm.md](./research/openscad-wasm.md).

## ADR-0002: Separate editing proxies from real mesh

Date: 2026-06-06. Status: accepted.

Context: live CSG per frame is too slow and heavy for fluid editing, but users
need real geometry for preview and export.

Decision: Three.js renders cheap proxy meshes for interactive editing; OpenSCAD
regenerates the real mesh only on HD preview and export. The source of truth is
the graph (`Module[]` + `Connection[]`), not either renderer.

Consequences: editing stays at 60 fps; real geometry is computed on demand off
the main thread. We maintain two representations of each module (a cheap proxy
and the OpenSCAD definition) and keep them consistent by deriving both from the
same parameters. This is the project's central architectural principle. See
[ARCHITECTURE.md](./ARCHITECTURE.md).

## ADR-0003: One universal connector standard

Date: 2026-06-06. Status: accepted.

Context: modules must interconnect freely and reconfigurably, and auto-split must
rejoin parts after printing.

Decision: a single friction-fit male/female connector standard, with rotational
keying and a round/square section rule, used by every port and every auto-split
cut. Tolerances tuned for the Bambu Lab P1S.

Consequences: any compatible male mates any female; the editor's snapping and the
physical assembly share one rule; auto-split just inserts a connector pair at
each cut. The connector becomes the load-bearing standard everything depends on,
so its tolerances must be coupon-validated before Phase 4 hardens them. See
[CONNECTOR_SPEC.md](./CONNECTOR_SPEC.md).

## ADR-0004: manifold-3d for booleans, validation, and Three.js interop

Date: 2026-06-06. Status: accepted.

Context: we need fast, guaranteed-manifold boolean operations and mesh validation
client-side, plus a bridge between generated meshes and Three.js geometry for HD
preview, and a splitter for auto-split.

Decision: use the standalone `manifold-3d` npm package (3.5.1 at research time)
for booleans, `status()`/`isEmpty()` validation, `splitByPlane`/`trimByPlane` in
auto-split, and `Mesh` to `BufferGeometry` conversion via the official three.js
interop pattern.

Consequences: the Manifold engine effectively runs twice in our stack, once
inside openscad-wasm (geometry generation) and once standalone (client-side
booleans, validation, splitting, interop). That duplication is intentional: the
standalone package gives us a typed JS API and the official Three.js bridge
without shelling everything through OpenSCAD CLI calls. See
[research/manifold-3d.md](./research/manifold-3d.md).

## ADR-0005: No backend for the MVP; JSON is the whole state

Date: 2026-06-06. Status: accepted.

Context: scope control and privacy for a hobbyist tool.

Decision: everything runs in the browser; the entire project is one serializable
JSON document; save/load is JSON in/out. No accounts, no server.

Consequences: shippable as a static site, privacy-friendly, easy to test. No
cloud sync or sharing in the MVP (can be added later without changing the domain
model, since the JSON document is self-contained). See
[DATA_MODEL.md](./DATA_MODEL.md).

## ADR-0006: Vendor openscad-wasm artifacts rather than depend on an npm package

Date: 2026-06-06. Status: accepted (revisit before Phase 4).

Context: there is no official openscad-wasm npm package. The official
distribution is GitHub Release artifacts; the latest tagged release is from 2022
though `main` is maintained to late 2025. Unofficial npm wrappers exist but vary
in provenance. See [research/openscad-wasm.md](./research/openscad-wasm.md).

Decision: vendor the wasm artifacts into `public/wasm/` (or build fresh from
`main`), not committed to git (the `.gitignore` excludes `public/wasm/openscad*`).

Consequences: we control exactly which build ships and avoid an unmaintained
third-party wrapper. Cost: we own the update/build process. Open item to settle
in Phase 4: ship the 2022 release vs build a current wasm from `main` (the latter
gets the current Manifold engine and fixes but adds Docker/Deno build work).

## ADR-0007: Toolchain pinned to current stable versions (2026-06)

Date: 2026-06-06. Status: accepted.

Context: scaffolding a fresh project in mid-2026.

Decision: pin to the current stable releases verified at scaffold time: Vue
3.5.x, Vite 8.x, Three 0.184.x, TypeScript 6.x, Vitest 4.x, manifold-3d 3.5.x,
ESLint 10.x with flat config and typescript-eslint 8.x. Node 22 LTS, pnpm.

Consequences: modern baseline, but a few interactions needed handling: TypeScript
6 with composite project references made `vue-tsc --build` emit stray config
`.d.ts` files and raised a declaration-portability error on the flat ESLint
config. Resolved by setting `noEmit` on the node tsconfig, dropping the `lib: []`
override in the vitest tsconfig, adding `@types/node` (pinned to the Node 22
line), and giving `eslint.config.ts` an explicit `ConfigArray` annotation. All
checks pass. Re-evaluate versions before Phase 4.

## ADR-0008: Phase 1 domain core shape

Date: 2026-06-06. Status: accepted.

Context: implementing the data model and graph (Phase 1) raised the open
questions flagged in [DATA_MODEL.md](./DATA_MODEL.md).

Decision:

- `ModuleParameters` stays an open record (`Record<string, number | string |
boolean>`) in the graph core. Per-type validation lives in the module
  library's `ParamSchema` (number with min/max, boolean, enum), so the core does
  not hard-depend on every type's schema.
- `Connection` stays minimal (`id`, `a`, `b`). Rotational clocking is derived
  geometry, not stored; it is enforced by construction in the editor (Phase 3)
  and by the geometric-coincidence invariant, not persisted.
- All matrix conventions live in one module (`src/domain/math.ts`): column-major
  Mat4 matching THREE.Matrix4.elements, port local +Z outward.
- `validateProject` returns a structured report splitting errors (invalidating)
  from warnings (for example a disconnected graph is a warning, not an error).
- Serialization is JSON of the `Project` tree with a `runMigrations` seam keyed
  by from-version; empty until a v2 schema exists.

Consequences: the domain layer is framework-free and unit-tested (51 tests),
ready for Phase 2 to build the viewport on top. One tooling addition: ESLint 10
needs `jiti` to load the TypeScript `eslint.config.ts`, so `jiti` is now an
explicit devDependency (it had been resolving only transitively).
