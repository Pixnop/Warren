/**
 * OpenSCAD source generation for module geometry (Phase 4). Pure and
 * framework-free; the worker feeds this text to openscad-wasm to produce the
 * real printable mesh (see docs/ARCHITECTURE.md export flow).
 *
 * Model: each module is the union of a central hub and one tube arm per port,
 * hollowed by a continuous bore. The universal connector (docs/CONNECTOR_SPEC.md)
 * is an outer sleeve on male ports: the mating module's plain female tube end
 * slips inside it, so the internal bore stays continuous and smooth for the
 * animal. Geometry is in module-local space (mm, Z up); placement happens at
 * assembly time, not here.
 *
 * Connector dimensions here are provisional and must be coupon-validated on the
 * target printer before being locked in CONNECTOR_SPEC.md.
 */

import type { Mat4 } from './math'
import { getTranslation, length } from './math'
import type { Module, ModuleParameters } from './types'
import { portsOf } from './modules/registry'

export interface ConnectorSpec {
  /** Radial slip clearance between female tube and male sleeve, mm. */
  clearance: number
  /** Male sleeve length (engagement depth), mm. */
  engagement: number
  /** Sleeve wall thickness, mm. */
  sleeveWall: number
  /** OpenSCAD facet count ($fn). */
  facets: number
}

export const DEFAULT_CONNECTOR: ConnectorSpec = {
  clearance: 0.2,
  engagement: 12,
  sleeveWall: 1.6,
  // Smoothness of curved surfaces. Overridable per call so the editor can use a
  // lower count for a quick preview and a higher one for export.
  facets: 96,
}

const fmt = (x: number): string => String(Number(x.toFixed(3)))

function num(params: ModuleParameters, key: string, fallback: number): number {
  const v = params[key]
  return typeof v === 'number' ? v : fallback
}

/** A port's local frame as an OpenSCAD multmatrix argument (row-major rows). */
function multmatrixRows(p: Mat4): string {
  const row = (i: number) =>
    `[${fmt(p[i] as number)}, ${fmt(p[i + 4] as number)}, ${fmt(p[i + 8] as number)}, ${fmt(p[i + 12] as number)}]`
  return `[${row(0)}, ${row(1)}, ${row(2)}, ${row(3)}]`
}

export function scadForModule(
  module: Module,
  connector: ConnectorSpec = DEFAULT_CONNECTOR,
): string {
  const wall = num(module.parameters, 'wall', 3)
  const { clearance, engagement: L, sleeveWall } = connector
  const ports = portsOf(module)

  const solids: string[] = []
  const cavities: string[] = []
  let maxOuterR = 0
  let maxBoreR = 0

  for (const port of ports) {
    const boreR = port.section.nominalSize / 2
    const outerR = boreR + wall
    const socketR = outerR + clearance
    const sleeveR = socketR + sleeveWall
    maxOuterR = Math.max(maxOuterR, outerR)
    maxBoreR = Math.max(maxBoreR, boreR)

    const armLen = length(getTranslation(port.transform)) + outerR
    const frame = multmatrixRows(port.transform)
    const male = port.gender === 'male'

    const solid = [`  // port ${port.id} (${port.gender})`, `  multmatrix(${frame}) {`]
    solid.push(
      `    translate([0, 0, ${fmt(-armLen)}]) cylinder(h = ${fmt(armLen + 0.01)}, r = ${fmt(outerR)});`,
    )
    if (male) {
      solid.push(`    // male sleeve`)
      solid.push(`    cylinder(h = ${fmt(L)}, r = ${fmt(sleeveR)});`)
    }
    solid.push('  }')
    solids.push(solid.join('\n'))

    const cavity = [`  multmatrix(${frame}) {`]
    cavity.push(
      `    translate([0, 0, ${fmt(-(armLen + 1))}]) cylinder(h = ${fmt(armLen + L + 2)}, r = ${fmt(boreR)});`,
    )
    if (male) {
      cavity.push(`    cylinder(h = ${fmt(L + 0.5)}, r = ${fmt(socketR)});`)
    }
    cavity.push('  }')
    cavities.push(cavity.join('\n'))
  }

  return [
    `// Warren module ${module.id} (${module.type})`,
    `$fn = ${connector.facets};`,
    'difference() {',
    '  union() {',
    `    sphere(r = ${fmt(maxOuterR)});`,
    ...solids,
    '  }',
    '  union() {',
    `    sphere(r = ${fmt(maxBoreR)});`,
    ...cavities,
    '  }',
    '}',
    '',
  ].join('\n')
}
