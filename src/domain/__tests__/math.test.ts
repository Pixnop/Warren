import { describe, it, expect } from 'vitest'
import {
  IDENTITY,
  translation,
  rotationX,
  rotationY,
  rotationZ,
  multiply,
  transformPoint,
  getTranslation,
  getAxis,
  dot,
  vec3ApproxEqual,
  type Mat4,
} from '../math'

const HALF_PI = Math.PI / 2

describe('IDENTITY', () => {
  it('leaves a point unchanged', () => {
    expect(transformPoint(IDENTITY, [3, -4, 5])).toEqual([3, -4, 5])
  })
})

describe('translation', () => {
  it('stores the offset in the column-major translation slots (12,13,14)', () => {
    const t = translation([1, 2, 3])
    expect(t[12]).toBe(1)
    expect(t[13]).toBe(2)
    expect(t[14]).toBe(3)
  })

  it('moves a point by the offset', () => {
    expect(transformPoint(translation([10, 20, 30]), [1, 1, 1])).toEqual([11, 21, 31])
  })
})

describe('rotationZ', () => {
  it('rotates +X to +Y at +90 degrees (right-handed)', () => {
    const p = transformPoint(rotationZ(HALF_PI), [1, 0, 0])
    expect(vec3ApproxEqual(p, [0, 1, 0])).toBe(true)
  })
})

describe('rotationX', () => {
  it('rotates +Y to +Z at +90 degrees (right-handed)', () => {
    const p = transformPoint(rotationX(HALF_PI), [0, 1, 0])
    expect(vec3ApproxEqual(p, [0, 0, 1])).toBe(true)
  })

  it('flips +Z to -Z at 180 degrees', () => {
    const p = transformPoint(rotationX(Math.PI), [0, 0, 1])
    expect(vec3ApproxEqual(p, [0, 0, -1])).toBe(true)
  })
})

describe('rotationY', () => {
  it('rotates +Z to +X at +90 degrees (right-handed)', () => {
    const p = transformPoint(rotationY(HALF_PI), [0, 0, 1])
    expect(vec3ApproxEqual(p, [1, 0, 0])).toBe(true)
  })
})

describe('multiply', () => {
  it('is identity when either operand is IDENTITY', () => {
    const m = translation([1, 2, 3])
    expect(multiply(IDENTITY, m)).toEqual(m)
    expect(multiply(m, IDENTITY)).toEqual(m)
  })

  it('composes as parent then child: transformPoint(parent*child, p) applies child first', () => {
    const parent = translation([0, 0, 100])
    const child = translation([0, 0, 10])
    const world = multiply(parent, child)
    // child local origin [0,0,0] should land at world [0,0,110]
    expect(transformPoint(world, [0, 0, 0])).toEqual([0, 0, 110])
  })

  it('matches nested transformPoint application', () => {
    const parent = multiply(translation([5, 0, 0]), rotationZ(HALF_PI))
    const child = translation([2, 0, 0])
    const world = multiply(parent, child)
    const p: [number, number, number] = [1, 1, 1]
    const composed = transformPoint(world, p)
    const nested = transformPoint(parent, transformPoint(child, p))
    expect(vec3ApproxEqual(composed, nested)).toBe(true)
  })
})

describe('getTranslation / getAxis', () => {
  it('reads the origin of a composed frame', () => {
    const frame = multiply(translation([1, 2, 3]), rotationZ(HALF_PI))
    expect(vec3ApproxEqual(getTranslation(frame), [1, 2, 3])).toBe(true)
  })

  it('reads normalized basis axes', () => {
    const frame = rotationZ(HALF_PI)
    expect(vec3ApproxEqual(getAxis(frame, 'x'), [0, 1, 0])).toBe(true)
    expect(vec3ApproxEqual(getAxis(frame, 'z'), [0, 0, 1])).toBe(true)
  })
})

describe('dot', () => {
  it('is -1 for opposing unit vectors (used for anti-parallel port axes)', () => {
    expect(dot([0, 0, 1], [0, 0, -1])).toBe(-1)
  })
})

describe('vec3ApproxEqual', () => {
  it('respects the tolerance', () => {
    expect(vec3ApproxEqual([0, 0, 0], [0, 0, 1e-12])).toBe(true)
    expect(vec3ApproxEqual([0, 0, 0], [0, 0, 0.01])).toBe(false)
    expect(vec3ApproxEqual([0, 0, 0], [0, 0, 0.01], 0.1)).toBe(true)
  })
})

// Type-level sanity: a Mat4 is a 16-tuple.
const _len: Mat4 = IDENTITY
void _len
