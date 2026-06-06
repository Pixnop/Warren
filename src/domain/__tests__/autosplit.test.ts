import { describe, it, expect } from 'vitest'
import { splitStraight } from '../autosplit'
import { validateProject } from '../validate'
import { defaultParameters, portsOf } from '../modules/registry'
import { IDENTITY, multiply, getTranslation } from '../math'
import type { Module, PrintBox, Project, ProjectSettings } from '../types'

const BOX: PrintBox = { size: [250, 250, 250], margin: 3 } // usable 244

const SETTINGS: ProjectSettings = {
  cage: { dimensions: [400, 300, 400], barSpacing: 12.5, barDiameter: 3 },
  printBox: BOX,
  material: 'PETG',
  defaultWallThickness: 3,
}

function straight(id: string, length: number): Module {
  return {
    id,
    type: 'straight',
    parameters: { ...defaultParameters('straight'), length },
    transform: IDENTITY,
  }
}

function projectOf(modules: Module[], connections: Project['connections']): Project {
  return { schemaVersion: 1, appVersion: 't', name: 't', settings: SETTINGS, modules, connections }
}

const portWorld = (m: Module, portId: string) => {
  const p = portsOf(m).find((pp) => pp.id === portId)!
  return getTranslation(multiply(m.transform, p.transform))
}

describe('splitStraight', () => {
  it('returns null for a straight that already fits', () => {
    expect(splitStraight(straight('m', 200), BOX)).toBeNull()
  })

  it('returns null for a non-straight module', () => {
    const tee: Module = {
      id: 'm',
      type: 'tee',
      parameters: defaultParameters('tee'),
      transform: IDENTITY,
    }
    expect(splitStraight(tee, BOX)).toBeNull()
  })

  it('splits a 600 mm run into three connected 200 mm sub-straights', () => {
    const result = splitStraight(straight('m', 600), BOX)
    expect(result).not.toBeNull()
    if (result === null) return
    expect(result.modules).toHaveLength(3)
    expect(result.connections).toHaveLength(2)
    for (const sub of result.modules) {
      expect(sub.type).toBe('straight')
      expect(sub.parameters.length).toBe(200)
    }
  })

  it('produces a valid, fully-connected graph (each cut gets a real connector)', () => {
    const result = splitStraight(straight('m', 600), BOX)!
    const report = validateProject(projectOf(result.modules, result.connections))
    expect(report.errors).toEqual([])
    expect(report.warnings).toEqual([]) // single connected component
    expect(report.ok).toBe(true)
  })

  it('preserves total length and reproduces the original end ports', () => {
    const original = straight('m', 600)
    const result = splitStraight(original, BOX)!
    const total = result.modules.reduce((s, m) => s + (m.parameters.length as number), 0)
    expect(total).toBe(600)

    const first = result.modules[0]!
    const last = result.modules[result.modules.length - 1]!
    expect(portWorld(first, 'a')).toEqual(portWorld(original, 'a'))
    expect(portWorld(last, 'b')).toEqual(portWorld(original, 'b'))
  })
})
