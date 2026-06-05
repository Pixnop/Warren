/**
 * Minimal column-major 3D math for the domain layer.
 *
 * Mat4 uses the same column-major layout as THREE.Matrix4.elements and
 * OpenSCAD's multmatrix, so a transform can pass between layers without
 * re-encoding (see docs/DATA_MODEL.md). The element at column `c`, row `r`
 * lives at index `c * 4 + r`; the translation is in slots 12, 13, 14.
 *
 * This module is framework-free and the only place matrix conventions live.
 */

export type Vec3 = readonly [number, number, number]

/** Column-major 4x4, identical layout to THREE.Matrix4.elements. */
export type Mat4 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** Read element at flat index, narrowed from the fixed-size tuple. */
function at(m: Mat4, i: number): number {
  return m[i] as number
}

export function translation([x, y, z]: Vec3): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]
}

/** Right-handed rotation about +Z by `radians`. Maps +X toward +Y. */
export function rotationZ(radians: number): Mat4 {
  const c = Math.cos(radians)
  const s = Math.sin(radians)
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

/** Right-handed rotation about +X by `radians`. Maps +Y toward +Z. */
export function rotationX(radians: number): Mat4 {
  const c = Math.cos(radians)
  const s = Math.sin(radians)
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]
}

/** Right-handed rotation about +Y by `radians`. Maps +Z toward +X. */
export function rotationY(radians: number): Mat4 {
  const c = Math.cos(radians)
  const s = Math.sin(radians)
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]
}

/** Matrix product a * b (column-major), matching THREE.multiplyMatrices.
 *  Applied to a point, b acts first (a is the parent / outer frame). */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += at(a, k * 4 + row) * at(b, col * 4 + k)
      }
      out[col * 4 + row] = sum
    }
  }
  return out as unknown as Mat4
}

/** Apply an affine matrix to a point (w = 1). */
export function transformPoint(m: Mat4, [x, y, z]: Vec3): Vec3 {
  return [
    at(m, 0) * x + at(m, 4) * y + at(m, 8) * z + at(m, 12),
    at(m, 1) * x + at(m, 5) * y + at(m, 9) * z + at(m, 13),
    at(m, 2) * x + at(m, 6) * y + at(m, 10) * z + at(m, 14),
  ]
}

/** The frame origin (translation column). */
export function getTranslation(m: Mat4): Vec3 {
  return [at(m, 12), at(m, 13), at(m, 14)]
}

/** A normalized basis axis of the frame. */
export function getAxis(m: Mat4, axis: 'x' | 'y' | 'z'): Vec3 {
  const col = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  return normalize([at(m, col * 4), at(m, col * 4 + 1), at(m, col * 4 + 2)])
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function length(v: Vec3): number {
  return Math.sqrt(dot(v, v))
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v)
  if (len === 0) return [0, 0, 0]
  return [v[0] / len, v[1] / len, v[2] / len]
}

/** Componentwise approximate equality within an absolute tolerance. */
export function vec3ApproxEqual(a: Vec3, b: Vec3, eps = 1e-9): boolean {
  return (
    Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps && Math.abs(a[2] - b[2]) <= eps
  )
}
