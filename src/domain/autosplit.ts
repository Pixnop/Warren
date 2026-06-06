/**
 * Model-level auto-split (Phase 5). The clean case: an oversized straight run is
 * replaced by N collinear sub-straights joined by the universal connector
 * (docs/CONNECTOR_SPEC.md), so every cut gets a real connector and the pieces
 * reassemble exactly into the original. Pure and framework-free.
 *
 * Non-straight oversized parts (for example a big platform) are handled at the
 * mesh level by the manifold worker, not here.
 */

import type { Connection, Module, PrintBox } from './types'
import { multiply, translation } from './math'
import { pieceCount, usableExtent } from './split'

export interface SplitResult {
  modules: Module[]
  connections: Connection[]
}

function num(params: Module['parameters'], key: string): number {
  const v = params[key]
  return typeof v === 'number' ? v : 0
}

/**
 * Split a straight module into connected sub-straights that each fit the print
 * box. Returns null if the module is not a straight, or already fits.
 */
export function splitStraight(module: Module, box: PrintBox): SplitResult | null {
  if (module.type !== 'straight') return null

  const length = num(module.parameters, 'length')
  const maxLength = Math.max(...usableExtent(box))
  const n = pieceCount(length, maxLength)
  if (n <= 1) return null

  const pieceLen = length / n
  const half = length / 2
  const modules: Module[] = []
  const connections: Connection[] = []

  for (let i = 0; i < n; i++) {
    const center = -half + (i + 0.5) * pieceLen // piece center in module-local Z
    const id = `${module.id}.s${i + 1}`
    modules.push({
      id,
      type: 'straight',
      parameters: { ...module.parameters, length: pieceLen },
      transform: multiply(module.transform, translation([0, 0, center])),
    })
    if (i > 0) {
      // previous piece b (female) mates this piece a (male) at the shared plane.
      connections.push({
        id: `${module.id}.c${i}`,
        a: { moduleId: `${module.id}.s${i}`, portId: 'b' },
        b: { moduleId: id, portId: 'a' },
      })
    }
  }

  return { modules, connections }
}
