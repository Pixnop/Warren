import { describe, it, expect } from 'vitest'
import { scadForModule, DEFAULT_CONNECTOR } from '../scad'
import { defaultParameters } from '../modules/registry'
import { IDENTITY } from '../math'
import type { Module, ModuleType } from '../types'

function mod(type: ModuleType, parameters = defaultParameters(type)): Module {
  return { id: 'm', type, parameters, transform: IDENTITY }
}

const count = (s: string, sub: string) => s.split(sub).length - 1

describe('scadForModule', () => {
  it('emits a manifold-friendly difference of unions with the OpenSCAD header', () => {
    const s = scadForModule(mod('straight'))
    expect(s).toContain('$fn')
    expect(s).toContain('difference()')
    expect(s).toContain('union()')
    expect(s).toContain('multmatrix(')
    expect(s).toContain('cylinder(')
    expect(s).toContain('sphere(')
  })

  it('uses the port bore radius (half the nominal section size)', () => {
    // default straight bore is 40 -> radius 20
    expect(scadForModule(mod('straight'))).toContain('r = 20')
  })

  it('labels every port and only male ports get a sleeve', () => {
    const s = scadForModule(mod('straight')) // a male, b female
    expect(count(s, '// port ')).toBe(2)
    expect(count(s, '// male sleeve')).toBe(1)
  })

  it('handles a three-port module (tee: one male, two female)', () => {
    const s = scadForModule(mod('tee'))
    expect(count(s, '// port ')).toBe(3)
    expect(count(s, '// male sleeve')).toBe(1)
  })

  it('uses each port section for a transition (bores 40 and 30 -> radii 20 and 15)', () => {
    const s = scadForModule(mod('transition'))
    expect(s).toContain('r = 20')
    expect(s).toContain('r = 15')
  })

  it('is deterministic for the same module', () => {
    const m = mod('elbow')
    expect(scadForModule(m)).toBe(scadForModule(m))
  })

  it('accepts a custom connector spec', () => {
    const s = scadForModule(mod('straight'), { ...DEFAULT_CONNECTOR, facets: 16 })
    expect(s).toContain('$fn = 16')
  })
})
