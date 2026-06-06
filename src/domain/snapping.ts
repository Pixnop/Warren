/**
 * Port snapping geometry (Phase 3). Pure and framework-free.
 *
 * Mating rule (see docs/CONNECTOR_SPEC.md): a moving port mates a target when
 * their world frames share an origin, their +Z axes are anti-parallel, and
 * their +X (key) axes align. To make a moving port mate a fixed target frame
 * W_t, the moving module's new transform is
 *
 *   M' = W_t * Rx(pi) * inverse(P_m)
 *
 * where P_m is the moving port's local frame. Rx(pi) flips +Z to -Z and keeps
 * +X, giving the anti-parallel, key-aligned mate.
 */

import type { Gender, Module, Port, PortRef, Project, Section } from './types'
import type { Mat4 } from './math'
import { getTranslation, invertRigid, multiply, rotationX } from './math'
import { portsCompatible } from './validate'
import { portsOf } from './modules/registry'

export interface TargetPort {
  ref: PortRef
  world: Mat4
  gender: Gender
  section: Section
}

export interface SnapResult {
  movingPortId: string
  target: PortRef
  /** Distance between the moving port and target origins before snapping, mm. */
  distance: number
  /** The new transform for the moving module that mates the two ports. */
  transform: Mat4
}

const FLIP = rotationX(Math.PI)

/**
 * Find the nearest compatible mate for any of the moving module's open ports
 * within `radius`, and the module transform that snaps them together. Returns
 * null when nothing compatible is in range.
 */
export function computeSnap(
  movingTransform: Mat4,
  movingPorts: readonly Port[],
  targets: readonly TargetPort[],
  radius: number,
): SnapResult | null {
  let best: SnapResult | null = null

  for (const mp of movingPorts) {
    const origin = getTranslation(multiply(movingTransform, mp.transform))
    for (const t of targets) {
      if (!portsCompatible(mp, t)) continue
      const to = getTranslation(t.world)
      const distance = Math.hypot(origin[0] - to[0], origin[1] - to[1], origin[2] - to[2])
      if (distance > radius) continue
      if (best === null || distance < best.distance) {
        best = {
          movingPortId: mp.id,
          target: t.ref,
          distance,
          transform: multiply(multiply(t.world, FLIP), invertRigid(mp.transform)),
        }
      }
    }
  }

  return best
}

const keyOf = (ref: PortRef): string => `${ref.moduleId} ${ref.portId}`

/** Keys ("moduleId portId") of every port currently in a connection. */
export function occupiedPortKeys(project: Project): Set<string> {
  const keys = new Set<string>()
  for (const c of project.connections) {
    keys.add(keyOf(c.a))
    keys.add(keyOf(c.b))
  }
  return keys
}

/** A module's own open ports (local frames), excluding occupied ones. */
export function openLocalPorts(project: Project, moduleId: string): Port[] {
  const module = project.modules.find((m) => m.id === moduleId)
  if (module === undefined) return []
  const occupied = occupiedPortKeys(project)
  return portsOf(module).filter((p) => !occupied.has(`${moduleId} ${p.id}`))
}

/** Open ports on every module except `excludeModuleId`, as world frames. */
export function openTargetPorts(project: Project, excludeModuleId: string): TargetPort[] {
  const occupied = occupiedPortKeys(project)
  const out: TargetPort[] = []
  for (const module of project.modules) {
    if (module.id === excludeModuleId) continue
    for (const p of portsOf(module)) {
      if (occupied.has(`${module.id} ${p.id}`)) continue
      out.push({
        ref: { moduleId: module.id, portId: p.id },
        world: worldFrame(module, p),
        gender: p.gender,
        section: p.section,
      })
    }
  }
  return out
}

function worldFrame(module: Module, port: Port): Mat4 {
  return multiply(module.transform, port.transform)
}
