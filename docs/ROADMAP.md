# Roadmap

Each phase has one testable objective and builds on the previous one. The domain
layer is built and tested before any geometry or UI depends on it. See
[ARCHITECTURE.md](./ARCHITECTURE.md) for the layering this follows.

Status legend: [ ] not started, [~] in progress, [x] done.

## Phase 0: scaffold and memory vault [x]

Vue 3 + TypeScript (strict) + Vite + Vitest project, ESLint + Prettier, the docs
vault (this folder), CLAUDE.md. Dependency versions researched and pinned.
openscad-wasm and manifold-3d documented. No application code.

Done when: `pnpm install`, `pnpm type-check`, `pnpm lint:check`, `pnpm test`,
and `pnpm build` all pass on a clean checkout. (Verified at scaffold time.)

## Phase 1: data model and graph [x]

Implement the domain core from [DATA_MODEL.md](./DATA_MODEL.md): `Vec3`, `Mat4`,
`Port`, `Module`, `Connection`, `Project`, the module library's `schema` and
`ports` for each type, and `validate(project)` enforcing the graph invariants.
Plus JSON serialize/deserialize with `schemaVersion` and a migration hook.

No Vue, no Three.js. Pure TypeScript, exhaustively unit-tested.

Testable objective: given hand-written project JSON, `validate` returns exactly
the right structured errors for each broken invariant, and round-tripping a
valid project through serialize/deserialize is identity.

Done (built test-first): `src/domain/` holds `math.ts` (column-major Mat4),
`types.ts`, the module library (`modules/schema.ts`, `modules/definition.ts`,
`modules/definitions.ts`, `modules/registry.ts` with all seven types),
`validate.ts` (`validateProject` covering invariants 1 to 7), and `serialize.ts`
(serialize/deserialize plus a `runMigrations` hook). Public surface re-exported
from `src/domain/index.ts`. 51 unit tests; type-check, lint, test, and build all
green.

## Phase 2: viewport and placement [x]

Three.js scene with proxy meshes for each module (the `proxy` part of the module
definition), a ground/cage reference, OrbitControls, selection via raycasting,
and a TransformControls gizmo to move/rotate placed modules. A palette to add
modules. Changes write back to the Phase 1 graph store.

No snapping yet, no real geometry. Proxies only.

Testable objective: a user can add, select, move, rotate, and delete modules;
the underlying `Project` graph stays in sync and re-serializes correctly.

Done: `src/stores/editor.ts` (reactive store bridging the domain graph, unit
tested), `src/viewport/` (a framework-agnostic Three.js controller plus
port-derived proxy meshes), and `src/ui/` (ViewportCanvas, ModulePalette,
ModuleInspector) wired into `App.vue`. The viewport runs Z-up. Verified in a real
browser (Playwright): add, select with gizmo, Move/Rotate, delete, with the live
validation report reacting (a disconnected graph shows as a warning). 59 unit
tests; type-check, lint, build all green. See DECISIONS.md ADR-0009.

## Phase 3: port snapping [x]

Render open ports as pickable oriented markers. While dragging a module, find
the nearest compatible open port (opposite gender, matching section), and when
within the snap radius, snap the dragged module so its active port mates with the
target port (coincident, counter-oriented, keyed) and create the `Connection`.
Visual feedback for candidate ports and the snapped pose. Detach updates the
graph. Honor connector compatibility (see [CONNECTOR_SPEC.md](./CONNECTOR_SPEC.md)).

Testable objective: dragging one module's port near a compatible one creates a
valid connection that passes all invariants including geometric coincidence;
incompatible ports never snap.

Done: `src/domain/snapping.ts` (`computeSnap` returns the nearest compatible mate
within radius and the new module transform `M' = Wt*Rx(pi)*inv(Pm)`, plus open-
port helpers), built on `invertRigid` in math and the shared `portsCompatible`.
The store gained `addConnection`. The viewport highlights the candidate target
port during a drag and, on drop, snaps into place and creates the connection. 71
unit tests (8 for snapping geometry); the connected/valid state was verified in a
real browser. See DECISIONS.md ADR-0010.

## Phase 4: parametric OpenSCAD modules [ ]

Bring up openscad-wasm in a Web Worker (see
[research/openscad-wasm.md](./research/openscad-wasm.md)). Implement the `scad`
generator for each module type, parameterized by parameters and the standardized
connector. Add an HD preview that replaces a selected module's proxy with its
real mesh (converted via manifold-3d to a Three.js BufferGeometry). Validate the
connector fit with printed coupons and lock the tolerances in
[CONNECTOR_SPEC.md](./CONNECTOR_SPEC.md).

Testable objective: each module type generates a valid, manifold mesh from its
parameters in the worker, and a real printed male/female pair from two modules
actually fits.

## Phase 5: auto-split [ ]

A split planner that, for any part whose bounding box exceeds the print box
(default 250 mm cube, configurable; see
[research/printing-and-materials.md](./research/printing-and-materials.md)),
chooses cut planes and splits the mesh (manifold-3d `splitByPlane` /
`trimByPlane`), inserting a standard connector pair at each cut and keeping every
sub-part inside the box.

Testable objective: an oversized part (for example a long run or a big platform)
is split into sub-parts that each fit the box, each cut gets a valid connector,
and reassembling the sub-parts reproduces the original geometry within tolerance.

## Phase 6: multi-STL export and manifest [ ]

Tie the export flow together (see [ARCHITECTURE.md](./ARCHITECTURE.md)): validate
the graph, generate all parts, run auto-split, validate every result is a clean
manifold, emit one STL per printable part, and produce an assembly manifest
describing which parts connect to which, in what order, with which connector and
clocking. Package as a downloadable bundle. Project JSON save/load throughout.

Testable objective: a complete network exports to a set of STLs plus a manifest
that, followed by hand, reassembles into the designed network; every STL is a
valid manifold within the print box.

## Cross-cutting (ongoing)

- Tests first for the domain layer; Vitest green stays a merge gate.
- Keep the domain layer free of Vue and Three.js.
- Update [DECISIONS.md](./DECISIONS.md) when a non-obvious choice is made.
- Re-verify pinned dependency versions and the openscad-wasm vendoring strategy
  before Phase 4 (the research docs flag the open items).
