import { describe, it, expect } from 'vitest'
import {
  getDefinition,
  defaultParameters,
  validateParameters,
  portsOf,
  MODULE_TYPES,
} from '../registry'
import { IDENTITY, getTranslation, getAxis, vec3ApproxEqual } from '../../math'
import type { Module } from '../../types'

function moduleOf(type: Module['type'], parameters = defaultParameters(type)): Module {
  return { id: 'm', type, parameters, transform: IDENTITY }
}

describe('registry', () => {
  it('registers a definition for every module type', () => {
    for (const type of MODULE_TYPES) {
      expect(getDefinition(type).type).toBe(type)
    }
  })

  it('produces defaults that pass their own validation', () => {
    for (const type of MODULE_TYPES) {
      const result = validateParameters(type, defaultParameters(type))
      expect(result.ok, `${type} defaults should validate`).toBe(true)
    }
  })

  it('every default module yields at least one port with unique ids', () => {
    for (const type of MODULE_TYPES) {
      const ports = portsOf(moduleOf(type))
      expect(ports.length, `${type} ports`).toBeGreaterThanOrEqual(1)
      const ids = ports.map((p) => p.id)
      expect(new Set(ids).size, `${type} unique port ids`).toBe(ids.length)
    }
  })

  it('every port carries the module section and a positive nominal size', () => {
    for (const type of MODULE_TYPES) {
      for (const port of portsOf(moduleOf(type))) {
        expect(['round', 'square']).toContain(port.section.shape)
        expect(port.section.nominalSize).toBeGreaterThan(0)
      }
    }
  })
})

describe('straight', () => {
  it('exposes bore, section, wall, length, vents defaults', () => {
    const p = defaultParameters('straight')
    expect(p).toHaveProperty('bore')
    expect(p).toHaveProperty('section')
    expect(p).toHaveProperty('wall')
    expect(p).toHaveProperty('length')
    expect(p).toHaveProperty('vents')
  })

  it('has two coaxial ports at opposite ends with opposite genders', () => {
    const ports = portsOf(moduleOf('straight'))
    expect(ports.map((p) => p.id).sort()).toEqual(['a', 'b'])
    const a = ports.find((p) => p.id === 'a')!
    const b = ports.find((p) => p.id === 'b')!
    expect(a.gender).not.toBe(b.gender)

    const length = defaultParameters('straight').length as number
    expect(getTranslation(a.transform)[2]).toBeCloseTo(-length / 2)
    expect(getTranslation(b.transform)[2]).toBeCloseTo(length / 2)
  })

  it('points each port +Z axis outward along the tube', () => {
    const ports = portsOf(moduleOf('straight'))
    const a = ports.find((p) => p.id === 'a')!
    const b = ports.find((p) => p.id === 'b')!
    expect(vec3ApproxEqual(getAxis(a.transform, 'z'), [0, 0, -1])).toBe(true)
    expect(vec3ApproxEqual(getAxis(b.transform, 'z'), [0, 0, 1])).toBe(true)
  })

  it('rejects a non-positive length', () => {
    expect(validateParameters('straight', { length: 0 }).ok).toBe(false)
  })
})
