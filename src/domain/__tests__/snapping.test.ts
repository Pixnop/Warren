import { describe, it, expect } from 'vitest'
import {
  computeSnap,
  occupiedPortKeys,
  openLocalPorts,
  openTargetPorts,
  type TargetPort,
} from '../snapping'
import { IDENTITY, translation, rotationX, multiply, getTranslation, getAxis, dot } from '../math'
import { defaultParameters } from '../modules/registry'
import type { Port, Project, ProjectSettings } from '../types'

const PI = Math.PI
const ROUND40 = { shape: 'round', nominalSize: 40 } as const

/** A frame at `pos`; by default +Z faces up, faceNeg flips it to face -Z. */
function frameAt(pos: [number, number, number], faceNeg = false) {
  return faceNeg ? multiply(translation(pos), rotationX(PI)) : translation(pos)
}

const movingPort: Port = {
  id: 'a',
  transform: frameAt([0, 0, -50], true), // origin [0,0,-50], +Z faces -Z, male
  gender: 'male',
  section: ROUND40,
}

function target(
  moduleId: string,
  world: ReturnType<typeof frameAt>,
  gender: 'male' | 'female',
): TargetPort {
  return { ref: { moduleId, portId: 'b' }, world, gender, section: ROUND40 }
}

describe('computeSnap', () => {
  it('returns null when there are no targets', () => {
    expect(computeSnap(IDENTITY, [movingPort], [], 10)).toBeNull()
  })

  it('returns null when the nearest compatible port is beyond the radius', () => {
    const far = target('t', frameAt([0, 0, -200]), 'female')
    expect(computeSnap(IDENTITY, [movingPort], [far], 10)).toBeNull()
  })

  it('does not snap to an incompatible (same gender) port within radius', () => {
    const male = target('t', frameAt([0, 0, -50]), 'male')
    expect(computeSnap(translation([2, 0, 0]), [movingPort], [male], 10)).toBeNull()
  })

  it('snaps a compatible port within radius and mates the frames', () => {
    const t = target('t', frameAt([0, 0, -50]), 'female') // faces +Z at [0,0,-50]
    const result = computeSnap(translation([2, 0, 0]), [movingPort], [t], 10)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.movingPortId).toBe('a')
      expect(result.target).toEqual({ moduleId: 't', portId: 'b' })
      // After applying the snap transform, the moving port world frame must
      // coincide with the target and face opposite it.
      const world = multiply(result.transform, movingPort.transform)
      const o = getTranslation(world)
      expect(o[0]).toBeCloseTo(0)
      expect(o[1]).toBeCloseTo(0)
      expect(o[2]).toBeCloseTo(-50)
      expect(dot(getAxis(world, 'z'), getAxis(t.world, 'z'))).toBeCloseTo(-1)
    }
  })

  it('chooses the nearer of two compatible targets', () => {
    const near = target('near', frameAt([0, 0, -50]), 'female') // dist 2 from moving port
    const far = target('far', frameAt([10, 0, -50]), 'female') // dist ~8
    const result = computeSnap(translation([2, 0, 0]), [movingPort], [near, far], 20)
    expect(result?.target.moduleId).toBe('near')
  })
})

const SETTINGS: ProjectSettings = {
  cage: { dimensions: [400, 300, 400], barSpacing: 12.5, barDiameter: 3 },
  printBox: { size: [250, 250, 250], margin: 3 },
  material: 'PETG',
  defaultWallThickness: 3,
}

function project(modules: Project['modules'], connections: Project['connections'] = []): Project {
  return {
    schemaVersion: 1,
    appVersion: 'test',
    name: 't',
    settings: SETTINGS,
    modules,
    connections,
  }
}

describe('open-port helpers', () => {
  it('reports occupied port keys from connections', () => {
    const p = project(
      [
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
      [{ id: 'c1', a: { moduleId: 'm1', portId: 'b' }, b: { moduleId: 'm2', portId: 'a' } }],
    )
    const keys = occupiedPortKeys(p)
    expect(keys.has('m1 b')).toBe(true)
    expect(keys.has('m2 a')).toBe(true)
    expect(keys.has('m1 a')).toBe(false)
  })

  it('lists open target ports on other modules as world frames, excluding the moving one', () => {
    const p = project([
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
    ])
    const targets = openTargetPorts(p, 'm1')
    // Only m2's ports, none from m1, all with world frames.
    expect(targets.every((t) => t.ref.moduleId === 'm2')).toBe(true)
    expect(targets.length).toBe(2)
  })

  it('lists a module own open ports as local frames, excluding occupied ones', () => {
    const p = project(
      [
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
      [{ id: 'c1', a: { moduleId: 'm1', portId: 'b' }, b: { moduleId: 'm2', portId: 'a' } }],
    )
    const open = openLocalPorts(p, 'm1').map((port) => port.id)
    expect(open).toEqual(['a'])
  })
})
