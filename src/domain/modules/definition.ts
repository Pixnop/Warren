/**
 * The module definition contract plus shared building blocks used by every
 * module type. A definition knows its parameter schema and how to compute its
 * ports from validated parameters. Proxy and OpenSCAD geometry arrive in later
 * phases (see docs/ROADMAP.md); Phase 1 needs only schema and ports.
 */

import type { ModuleParameters, ModuleType, Port, Section, SectionShape, Gender } from '../types'
import type { Mat4 } from '../math'
import { IDENTITY, multiply, rotationX, rotationY, translation } from '../math'
import type { BooleanSpec, EnumSpec, NumberSpec, ParamSchema } from './schema'

export interface ModuleDefinition {
  type: ModuleType
  schema: ParamSchema
  /** Compute ports from parameters. Parameters are assumed already validated;
   *  the registry validates (or falls back to defaults) before calling this. */
  ports(params: ModuleParameters): Port[]
}

// --- Shared parameter specs -------------------------------------------------

export const BORE: NumberSpec = { kind: 'number', default: 40, min: 5, max: 200 }
export const SECTION: EnumSpec = { kind: 'enum', default: 'round', values: ['round', 'square'] }
export const WALL: NumberSpec = { kind: 'number', default: 3, min: 0.8, max: 10 }
export const VENTS: BooleanSpec = { kind: 'boolean', default: false }
export const LENGTH: NumberSpec = { kind: 'number', default: 100, min: 1, max: 1000 }

// --- Parameter readers (narrowed from the open ModuleParameters record) -----

export function num(params: ModuleParameters, key: string): number {
  return params[key] as number
}

export function str(params: ModuleParameters, key: string): string {
  return params[key] as string
}

export function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** The section a module presents on its standard ports. */
export function sectionOf(params: ModuleParameters): Section {
  return { shape: str(params, 'section') as SectionShape, nominalSize: num(params, 'bore') }
}

// --- Port frame helpers -----------------------------------------------------
//
// A port frame's local +Z points OUTWARD along the connection axis. These
// helpers build the two canonical arm-end frames; rotating them places ports at
// angles (elbow, tee branch, wye).

/** An arm end at distance `d` along -Z, facing outward (-Z). */
export function endNeg(d: number): Mat4 {
  return multiply(translation([0, 0, -d]), rotationX(Math.PI))
}

/** An arm end at distance `d` along +Z, facing outward (+Z). */
export function endPos(d: number): Mat4 {
  return translation([0, 0, d])
}

/** Rotate a port frame about +Y (used to splay branches in the XZ plane). */
export function aboutY(radians: number, frame: Mat4): Mat4 {
  return multiply(rotationY(radians), frame)
}

export function port(id: string, transform: Mat4, gender: Gender, section: Section): Port {
  return { id, transform, gender, section }
}

export { IDENTITY }
