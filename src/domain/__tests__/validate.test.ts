import { describe, it, expect } from 'vitest'
import { validateProject } from '../validate'
import { defaultParameters } from '../modules/registry'
import { IDENTITY, translation, type Mat4 } from '../math'
import type { Connection, Module, Project, ProjectSettings } from '../types'

const SETTINGS: ProjectSettings = {
  cage: { dimensions: [400, 300, 400], barSpacing: 12.5, barDiameter: 3 },
  printBox: { size: [250, 250, 250], margin: 3 },
  material: 'PETG',
  defaultWallThickness: 3,
}

function project(over: Partial<Project> = {}): Project {
  return {
    schemaVersion: 1,
    appVersion: 'test',
    name: 'test',
    settings: SETTINGS,
    modules: [],
    connections: [],
    ...over,
  }
}

function straightMod(
  id: string,
  transform: Mat4 = IDENTITY,
  parameters = defaultParameters('straight'),
): Module {
  return { id, type: 'straight', parameters, transform }
}

function conn(id: string, am: string, ap: string, bm: string, bp: string): Connection {
  return { id, a: { moduleId: am, portId: ap }, b: { moduleId: bm, portId: bp } }
}

// Two straights placed so m1.b (female, +Z at z=50) mates m2.a (male, -Z at z=50).
function matedPair(): Project {
  return project({
    modules: [straightMod('m1', IDENTITY), straightMod('m2', translation([0, 0, 100]))],
    connections: [conn('c1', 'm1', 'b', 'm2', 'a')],
  })
}

const codes = (issues: { code: string }[]) => issues.map((i) => i.code)

describe('validateProject - valid graph', () => {
  it('accepts a correctly mated pair with no errors or warnings', () => {
    const report = validateProject(matedPair())
    expect(report.errors).toEqual([])
    expect(report.warnings).toEqual([])
    expect(report.ok).toBe(true)
  })
})

describe('validateProject - invariant 1: unique ids', () => {
  it('flags duplicate module ids', () => {
    const report = validateProject(
      project({ modules: [straightMod('m1'), straightMod('m1', translation([0, 0, 200]))] }),
    )
    expect(codes(report.errors)).toContain('duplicate-module-id')
    expect(report.ok).toBe(false)
  })

  it('flags duplicate connection ids', () => {
    const p = matedPair()
    p.connections = [p.connections[0]!, { ...p.connections[0]!, id: p.connections[0]!.id }]
    const report = validateProject(p)
    expect(codes(report.errors)).toContain('duplicate-connection-id')
  })
})

describe('validateProject - invariant 2: referential integrity', () => {
  it('flags a connection referencing a missing module', () => {
    const report = validateProject(
      project({ modules: [straightMod('m1')], connections: [conn('c1', 'm1', 'b', 'ghost', 'a')] }),
    )
    expect(codes(report.errors)).toContain('unknown-module')
  })

  it('flags a connection referencing a missing port', () => {
    const p = matedPair()
    p.connections = [conn('c1', 'm1', 'nope', 'm2', 'a')]
    const report = validateProject(p)
    expect(codes(report.errors)).toContain('unknown-port')
  })
})

describe('validateProject - invariant 3: single occupancy', () => {
  it('flags a port used by two connections', () => {
    const p = project({
      modules: [
        straightMod('m1', IDENTITY),
        straightMod('m2', translation([0, 0, 100])),
        straightMod('m3', translation([0, 0, -100])),
      ],
      // m1.b is mated twice (to m2.a and to m3.a).
      connections: [conn('c1', 'm1', 'b', 'm2', 'a'), conn('c2', 'm1', 'b', 'm3', 'a')],
    })
    const report = validateProject(p)
    expect(codes(report.errors)).toContain('port-double-connected')
  })
})

describe('validateProject - invariant 4: no self-connected port', () => {
  it('flags a connection whose two endpoints are the same port', () => {
    const p = project({
      modules: [straightMod('m1')],
      connections: [conn('c1', 'm1', 'a', 'm1', 'a')],
    })
    const report = validateProject(p)
    expect(codes(report.errors)).toContain('self-connected-port')
  })
})

describe('validateProject - invariant 5: connector compatibility', () => {
  it('flags two same-gender ports', () => {
    // m1.a (male) to m2.a (male).
    const p = project({
      modules: [straightMod('m1'), straightMod('m2', translation([0, 0, -100]))],
      connections: [conn('c1', 'm1', 'a', 'm2', 'a')],
    })
    const report = validateProject(p)
    expect(codes(report.errors)).toContain('incompatible-connector')
  })

  it('flags mismatched section size', () => {
    const p = project({
      modules: [
        straightMod('m1'),
        straightMod('m2', translation([0, 0, 100]), {
          ...defaultParameters('straight'),
          bore: 30,
        }),
      ],
      connections: [conn('c1', 'm1', 'b', 'm2', 'a')],
    })
    const report = validateProject(p)
    expect(codes(report.errors)).toContain('incompatible-connector')
  })
})

describe('validateProject - invariant 6: geometric coincidence', () => {
  it('flags ports that are connected in the graph but not physically mated', () => {
    const p = project({
      modules: [straightMod('m1'), straightMod('m2', translation([0, 0, 500]))],
      connections: [conn('c1', 'm1', 'b', 'm2', 'a')],
    })
    const report = validateProject(p)
    expect(codes(report.errors)).toContain('ports-not-coincident')
  })
})

describe('validateProject - invariant 7: connectivity warning', () => {
  it('warns (but does not error) on a disconnected graph', () => {
    const p = project({
      modules: [
        straightMod('m1'),
        straightMod('m2', translation([0, 0, 100])),
        // m3 is an island with no connections.
        straightMod('m3', translation([500, 0, 0])),
      ],
      connections: [conn('c1', 'm1', 'b', 'm2', 'a')],
    })
    const report = validateProject(p)
    expect(codes(report.warnings)).toContain('disconnected-graph')
    expect(report.ok).toBe(true)
  })
})

describe('validateProject - module parameters', () => {
  it('flags a module with invalid parameters', () => {
    const p = project({
      modules: [straightMod('m1', IDENTITY, { ...defaultParameters('straight'), length: 0 })],
    })
    const report = validateProject(p)
    expect(codes(report.errors)).toContain('invalid-parameters')
  })
})
