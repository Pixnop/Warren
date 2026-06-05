import { describe, it, expect } from 'vitest'
import {
  serialize,
  deserialize,
  runMigrations,
  CURRENT_SCHEMA_VERSION,
  type Migration,
} from '../serialize'
import { defaultParameters } from '../modules/registry'
import { IDENTITY, translation } from '../math'
import type { Project, ProjectSettings } from '../types'

const SETTINGS: ProjectSettings = {
  cage: { dimensions: [400, 300, 400], barSpacing: 12.5, barDiameter: 3 },
  printBox: { size: [250, 250, 250], margin: 3 },
  material: 'PETG',
  defaultWallThickness: 3,
}

function validProject(): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: 'test',
    name: 'demo',
    settings: SETTINGS,
    modules: [
      {
        id: 'm1',
        type: 'straight',
        parameters: defaultParameters('straight'),
        transform: IDENTITY,
      },
      {
        id: 'm2',
        type: 'straight',
        parameters: defaultParameters('straight'),
        transform: translation([0, 0, 100]),
      },
    ],
    connections: [
      { id: 'c1', a: { moduleId: 'm1', portId: 'b' }, b: { moduleId: 'm2', portId: 'a' } },
    ],
  }
}

describe('serialize', () => {
  it('produces JSON that contains the project name', () => {
    expect(serialize(validProject())).toContain('"demo"')
  })
})

describe('deserialize', () => {
  it('round-trips a valid project to an identical value', () => {
    const original = validProject()
    const result = deserialize(serialize(original))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.project).toEqual(original)
      expect(result.report.ok).toBe(true)
    }
  })

  it('fails on malformed JSON', () => {
    const result = deserialize('{ not json')
    expect(result.ok).toBe(false)
  })

  it('fails when required top-level fields are missing', () => {
    const result = deserialize(JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION }))
    expect(result.ok).toBe(false)
  })

  it('fails on a schema version newer than this build supports', () => {
    const future = { ...validProject(), schemaVersion: CURRENT_SCHEMA_VERSION + 99 }
    const result = deserialize(JSON.stringify(future))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/version/i)
  })

  it('parses a structurally valid but graph-invalid project and reports the graph errors', () => {
    const broken = validProject()
    broken.modules[1]!.id = 'm1' // duplicate id
    const result = deserialize(serialize(broken))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.report.ok).toBe(false)
      expect(result.report.errors.map((e) => e.code)).toContain('duplicate-module-id')
    }
  })
})

describe('runMigrations', () => {
  it('applies step migrations in order up to the target version', () => {
    const migrations: Record<number, Migration> = {
      0: (d) => ({ ...d, schemaVersion: 1, stepOne: true }),
      1: (d) => ({ ...d, schemaVersion: 2, stepTwo: true }),
    }
    const out = runMigrations({ schemaVersion: 0 }, 0, 2, migrations)
    expect(out).toMatchObject({ schemaVersion: 2, stepOne: true, stepTwo: true })
  })

  it('throws when a migration step is missing', () => {
    expect(() => runMigrations({ schemaVersion: 0 }, 0, 2, {})).toThrow()
  })
})
