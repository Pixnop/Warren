/**
 * The seven module definitions. Each declares its parameter schema and computes
 * its ports as oriented frames local to the module. Parameter values are
 * provisional starting points (see docs/MODULES.md); geometry generation is a
 * later phase. Every port is one half of the universal connector
 * (docs/CONNECTOR_SPEC.md).
 */

import type { ModuleParameters, Port } from '../types'
import type { ModuleDefinition } from './definition'
import {
  BORE,
  LENGTH,
  SECTION,
  VENTS,
  WALL,
  aboutY,
  deg2rad,
  endNeg,
  endPos,
  num,
  port,
  sectionOf,
  str,
} from './definition'
import type { SectionShape } from '../types'

const straight: ModuleDefinition = {
  type: 'straight',
  schema: { bore: BORE, section: SECTION, wall: WALL, length: LENGTH, vents: VENTS },
  ports(params: ModuleParameters): Port[] {
    const s = sectionOf(params)
    const half = num(params, 'length') / 2
    return [port('a', endNeg(half), 'male', s), port('b', endPos(half), 'female', s)]
  },
}

const elbow: ModuleDefinition = {
  type: 'elbow',
  schema: {
    bore: BORE,
    section: SECTION,
    wall: WALL,
    angle: { kind: 'number', default: 90, min: 1, max: 179 },
    bendRadius: { kind: 'number', default: 30, min: 5, max: 200 },
    vents: VENTS,
  },
  ports(params: ModuleParameters): Port[] {
    const s = sectionOf(params)
    const arm = num(params, 'bendRadius')
    const a = endNeg(arm)
    const b = aboutY(deg2rad(num(params, 'angle')), endNeg(arm))
    return [port('a', a, 'male', s), port('b', b, 'female', s)]
  },
}

const tee: ModuleDefinition = {
  type: 'tee',
  schema: {
    bore: BORE,
    section: SECTION,
    wall: WALL,
    length: LENGTH,
    branchAngle: { kind: 'number', default: 90, min: 30, max: 150 },
    branchLength: { kind: 'number', default: 50, min: 5, max: 500 },
    vents: VENTS,
  },
  ports(params: ModuleParameters): Port[] {
    const s = sectionOf(params)
    const half = num(params, 'length') / 2
    const c = aboutY(deg2rad(num(params, 'branchAngle')), endPos(num(params, 'branchLength')))
    return [
      port('a', endNeg(half), 'male', s),
      port('b', endPos(half), 'female', s),
      port('c', c, 'female', s),
    ]
  },
}

const wye: ModuleDefinition = {
  type: 'wye',
  schema: {
    bore: BORE,
    section: SECTION,
    wall: WALL,
    length: LENGTH,
    splitAngle: { kind: 'number', default: 45, min: 10, max: 160 },
    branchLength: { kind: 'number', default: 60, min: 5, max: 500 },
    vents: VENTS,
  },
  ports(params: ModuleParameters): Port[] {
    const s = sectionOf(params)
    const half = num(params, 'length') / 2
    const arm = num(params, 'branchLength')
    const split = deg2rad(num(params, 'splitAngle')) / 2
    return [
      port('in', endNeg(half), 'male', s),
      port('a', aboutY(split, endPos(arm)), 'female', s),
      port('b', aboutY(-split, endPos(arm)), 'female', s),
    ]
  },
}

const transition: ModuleDefinition = {
  type: 'transition',
  schema: {
    sectionA: SECTION,
    boreA: BORE,
    sectionB: SECTION,
    boreB: { kind: 'number', default: 30, min: 5, max: 200 },
    wall: WALL,
    length: { kind: 'number', default: 40, min: 5, max: 500 },
  },
  ports(params: ModuleParameters): Port[] {
    const half = num(params, 'length') / 2
    const a = { shape: str(params, 'sectionA') as SectionShape, nominalSize: num(params, 'boreA') }
    const b = { shape: str(params, 'sectionB') as SectionShape, nominalSize: num(params, 'boreB') }
    return [port('a', endNeg(half), 'male', a), port('b', endPos(half), 'female', b)]
  },
}

const platform: ModuleDefinition = {
  type: 'platform',
  schema: {
    width: { kind: 'number', default: 120, min: 30, max: 1000 },
    depth: { kind: 'number', default: 120, min: 30, max: 1000 },
    height: { kind: 'number', default: 60, min: 10, max: 500 },
    bore: BORE,
    section: SECTION,
    wall: WALL,
    floorVents: VENTS,
  },
  ports(params: ModuleParameters): Port[] {
    const s = sectionOf(params)
    const halfW = num(params, 'width') / 2
    // Two opposing tube entries on the -X and +X walls, facing outward.
    return [
      port('a', aboutY(-Math.PI / 2, endPos(halfW)), 'male', s),
      port('b', aboutY(Math.PI / 2, endPos(halfW)), 'female', s),
    ]
  },
}

const cageMount: ModuleDefinition = {
  type: 'cage_mount',
  schema: {
    barSpacing: { kind: 'number', default: 12.5, min: 2, max: 60 },
    barDiameter: { kind: 'number', default: 3, min: 1, max: 20 },
    bars: { kind: 'number', default: 2, min: 1, max: 10 },
    bore: BORE,
    section: SECTION,
    wall: WALL,
  },
  ports(params: ModuleParameters): Port[] {
    const s = sectionOf(params)
    // Single tube-side port facing +X; the cage side is a clamp, not a port.
    return [port('tube', aboutY(Math.PI / 2, endPos(num(params, 'bore'))), 'male', s)]
  },
}

export const ALL_DEFINITIONS: readonly ModuleDefinition[] = [
  straight,
  elbow,
  tee,
  wye,
  transition,
  platform,
  cageMount,
]
