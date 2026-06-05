/**
 * Core domain types for a Warren project.
 *
 * The source of truth for a project is a graph: Module[] + Connection[], inside
 * a Project together with its settings. Everything else (Three.js proxies,
 * OpenSCAD meshes) is derived from this graph. See docs/DATA_MODEL.md for the
 * full specification and the graph invariants.
 *
 * Conventions: millimeters everywhere; right-handed, Z up; Mat4 is column-major
 * (see ./math). IDs are opaque stable strings, never reused within a project.
 */

import type { Mat4, Vec3 } from './math'

export type { Mat4, Vec3 } from './math'

// --- Connector typing -------------------------------------------------------

export type Gender = 'male' | 'female'

export type SectionShape = 'round' | 'square'

/**
 * The cross-section a connector presents. Two ports mate only if their sections
 * are equal in shape and nominal size (within the connector tolerance). See
 * docs/CONNECTOR_SPEC.md.
 */
export interface Section {
  shape: SectionShape
  /** Round: nominal bore diameter. Square: nominal inner side length. mm. */
  nominalSize: number
}

// --- Ports ------------------------------------------------------------------

/**
 * One connection interface on a module: an oriented frame plus connector typing.
 *
 * `transform` is local to the owning module. By convention local +Z points
 * outward along the connection axis (the direction a mate extends away from the
 * module) and local +X is the rotational key reference.
 */
export interface Port {
  /** Stable within the owning module (for example 'a', 'b', 'c', or 'in'). */
  id: string
  transform: Mat4
  gender: Gender
  section: Section
}

// --- Modules ----------------------------------------------------------------

export type ModuleType =
  | 'straight'
  | 'elbow'
  | 'tee'
  | 'wye'
  | 'transition'
  | 'platform'
  | 'cage_mount'

/**
 * Per-type parameters. Kept an open record in the graph core so the core does
 * not hard-depend on every type's schema; the module library validates and
 * normalizes per type. See docs/MODULES.md.
 */
export type ModuleParameters = Record<string, number | string | boolean>

/** A placed instance of a module type, with parameters and world placement. */
export interface Module {
  id: string
  type: ModuleType
  parameters: ModuleParameters
  /** World placement of the module's local frame. */
  transform: Mat4
  /** Optional human label shown in the UI. */
  label?: string
}

// --- Connections ------------------------------------------------------------

export interface PortRef {
  moduleId: string
  portId: string
}

/** An undirected mate between exactly two ports on two modules. */
export interface Connection {
  id: string
  a: PortRef
  b: PortRef
}

// --- Project and settings ---------------------------------------------------

export type Material = 'PETG' | 'PLA' | 'ABS' | 'ASA' | 'other'

export interface PrintBox {
  /** Usable print volume, mm. Default models the Bambu Lab P1S at a 250 cube. */
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
   *  chew-safe or food-safe. See docs/research/printing-and-materials.md. */
  material: Material
  /** Default wall thickness applied to modules unless overridden, mm. */
  defaultWallThickness: number
}

/** The serialization root. A project is exactly this tree. */
export interface Project {
  /** Bump on any breaking change to this schema. Starts at 1. */
  schemaVersion: number
  /** App version that wrote the file, for diagnostics. */
  appVersion: string
  name: string
  settings: ProjectSettings
  modules: Module[]
  connections: Connection[]
}
