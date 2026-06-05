# Data model

The source of truth for a Warren project is a graph of modules and the
connections between their ports. Everything else (Three.js proxies, OpenSCAD
meshes) is derived from this graph. See [ARCHITECTURE.md](./ARCHITECTURE.md).

These interfaces are the Phase 1 target (see [ROADMAP.md](./ROADMAP.md)). They
are a specification, not yet shipped code. Treat the field names here as the
contract.

## Conventions

- Units: millimeters everywhere.
- Coordinate space: right-handed, Z up. This matches OpenSCAD (the geometry
  engine) and the natural print orientation. The Three.js viewport adapts at its
  boundary; the domain layer is renderer-agnostic.
- Matrices: `Mat4` is a column-major 16-number array, the same layout as
  `THREE.Matrix4.elements` and OpenSCAD's `multmatrix`. This lets a transform
  pass between layers without re-encoding.
- IDs: opaque stable strings (for example UUID v4 or a short nanoid). Never
  reuse an id within a project.

```ts
export type Vec3 = readonly [number, number, number]

/** Column-major 4x4, identical layout to THREE.Matrix4.elements. */
export type Mat4 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]
```

## Port

A port is one connection interface on a module: an oriented frame plus the
connector typing that decides what may mate with it.

```ts
export type Gender = 'male' | 'female'

export type SectionShape = 'round' | 'square'

/** The cross-section a connector presents. Two ports mate only if their
 *  sections are equal in shape and nominal size (within the spec tolerance). */
export interface Section {
  shape: SectionShape
  /** Round: nominal bore diameter. Square: nominal inner side length. mm. */
  nominalSize: number
}

export interface Port {
  /** Stable within the owning module (for example 'a', 'b', 'c', or 'in'). */
  id: string
  /** Frame local to the module. By convention local +Z points OUTWARD along
   *  the connection axis (the direction a mate extends away from this module).
   *  Local +X is the rotational key reference (see CONNECTOR_SPEC.md). */
  transform: Mat4
  gender: Gender
  section: Section
}
```

Ports are produced by a module's definition from its parameters (a tee always
has three ports at known local frames). They are derived, but each carries a
stable `id` so connections can reference it. Whether ports are cached on the
`Module` instance or recomputed from the definition is an implementation choice
for Phase 1; the `id` contract holds either way.

## Module

A placed instance of a module type, with its parameters and its world placement.

```ts
export type ModuleType =
  | 'straight'
  | 'elbow'
  | 'tee'
  | 'wye'
  | 'transition'
  | 'platform'
  | 'cage_mount'

/** Per-type parameter records live in the module library. Kept open here so
 *  the domain core does not hard-depend on every type's schema. See MODULES.md. */
export type ModuleParameters = Record<string, number | string | boolean>

export interface Module {
  id: string
  type: ModuleType
  /** Validated against the type's schema in the module library (MODULES.md). */
  parameters: ModuleParameters
  /** World placement of the module's local frame. */
  transform: Mat4
  /** Optional human label shown in the UI. */
  label?: string
}
```

The set of ports for a module is `definition(type).ports(parameters)`; see
[MODULES.md](./MODULES.md) for each type's port layout.

## Connection

An undirected mate between exactly two ports on two (usually different) modules.

```ts
export interface PortRef {
  moduleId: string
  portId: string
}

export interface Connection {
  id: string
  a: PortRef
  b: PortRef
}
```

## Project (serialization root)

```ts
export interface PrintBox {
  /** Usable print volume in mm. Default models the Bambu Lab P1S at 250 cube
   *  with margin already applied. See research/printing-and-materials.md. */
  size: Vec3
  /** Extra clearance kept away from each edge, mm. */
  margin: number
}

export interface CageSpec {
  /** Width x Depth x Height of the cage interior, mm. */
  dimensions: Vec3
  /** Center-to-center spacing of the cage bars, mm. Drives cage_mount. */
  barSpacing: number
  /** Bar diameter, mm. */
  barDiameter: number
}

export interface ProjectSettings {
  cage: CageSpec
  printBox: PrintBox
  /** Default material, surfaced in UI copy. PETG recommended; no FDM print is
   *  chew-safe or food-safe. See research/printing-and-materials.md. */
  material: 'PETG' | 'PLA' | 'ABS' | 'ASA' | 'other'
  /** Default wall thickness applied to modules unless overridden, mm. */
  defaultWallThickness: number
}

export interface Project {
  /** Bump on any breaking change to this schema. Start at 1. */
  schemaVersion: number
  /** App version that wrote the file, for diagnostics. */
  appVersion: string
  name: string
  settings: ProjectSettings
  modules: Module[]
  connections: Connection[]
}
```

Serialization is plain JSON of `Project`. There is nothing to serialize that is
not in this tree. Load is JSON parse plus invariant validation (below). On a
`schemaVersion` mismatch, run a migration before validating.

## Graph invariants

A project is valid only if all of these hold. Phase 1 ships a `validate(project)`
that returns structured errors keyed to these rules.

1. Unique ids: all `Module.id` are unique; all `Connection.id` are unique.
2. Referential integrity: every `PortRef` names an existing module and an
   existing port id on that module's current parameters.
3. Single occupancy: each port participates in at most one connection. (A
   connector mates one-to-one.)
4. No self-loop on one port: `a` and `b` of a connection are different ports.
   (Connecting two ports of the same module is allowed if they are different
   ports and geometry permits, but a port cannot connect to itself.)
5. Connector compatibility: for every connection, the two ports have opposite
   `gender`, equal `section.shape`, and `section.nominalSize` within the
   connector tolerance (see [CONNECTOR_SPEC.md](./CONNECTOR_SPEC.md)).
6. Geometric coincidence (when placed): the two mated ports' world frames are
   coincident and counter-oriented within tolerance. The editor maintains this
   by construction via snapping; the validator flags drift.
7. Connectivity (warning, not error): the graph should be a single connected
   component. Disconnected islands are allowed but warned, since they print as
   separate networks.

Rules 1 to 5 are pure data checks (fast, always run). Rules 6 and 7 need world
transforms and are run before preview/export.

## Derived data (not serialized)

- World port frames: `Module.transform * Port.transform`.
- Open ports: ports with no connection; these are the snap targets in the editor
  and the only valid new-connection endpoints.
- Bounding boxes and split plans: computed at export time (Phase 5).

## Open questions

- Whether `parameters` should be a discriminated union per `ModuleType` in the
  type system (stronger types) or stay an open record validated at runtime
  (simpler core). Leaning discriminated union in the module library, open record
  in the graph core. Decide in Phase 1.
- Whether connections need to store the chosen rotational key/clocking, or
  whether it is always derived from the ports. See
  [CONNECTOR_SPEC.md](./CONNECTOR_SPEC.md).
