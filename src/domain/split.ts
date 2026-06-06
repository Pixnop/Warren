/**
 * Auto-split planning (Phase 5). Pure arithmetic: given a part's size and the
 * usable print box, decide how many pieces are needed and where to cut so every
 * piece fits. Shared by the model-level straight split and the mesh-level
 * (manifold) slab cutting. See docs/ROADMAP.md Phase 5.
 */

import type { PrintBox, Vec3 } from './types'

/** The usable print extent per axis: the box size minus the margin on each side. */
export function usableExtent(box: PrintBox): Vec3 {
  const m = box.margin * 2
  return [box.size[0] - m, box.size[1] - m, box.size[2] - m]
}

/** True when any axis of `size` exceeds the usable print extent. */
export function exceedsBox(size: Vec3, box: PrintBox): boolean {
  const u = usableExtent(box)
  return size[0] > u[0] || size[1] > u[1] || size[2] > u[2]
}

/** Number of equal pieces needed to keep each within `maxLength`. */
export function pieceCount(length: number, maxLength: number): number {
  if (maxLength <= 0) return 1
  return Math.max(1, Math.ceil(length / maxLength))
}

/**
 * Cut offsets along a single axis so a span of `length` is divided into equal
 * pieces that each fit within `maxLength`. Returns [] when one piece fits.
 */
export function planCuts(length: number, maxLength: number): number[] {
  const n = pieceCount(length, maxLength)
  if (n <= 1) return []
  const piece = length / n
  const cuts: number[] = []
  for (let i = 1; i < n; i++) cuts.push(piece * i)
  return cuts
}
