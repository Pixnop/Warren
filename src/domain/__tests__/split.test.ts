import { describe, it, expect } from 'vitest'
import { usableExtent, exceedsBox, planCuts, pieceCount } from '../split'
import type { PrintBox } from '../types'

const BOX: PrintBox = { size: [250, 250, 250], margin: 3 }

describe('usableExtent', () => {
  it('subtracts the margin from both sides of each axis', () => {
    expect(usableExtent(BOX)).toEqual([244, 244, 244])
  })
})

describe('exceedsBox', () => {
  it('is false when every axis fits the usable extent', () => {
    expect(exceedsBox([100, 100, 240], BOX)).toBe(false)
  })
  it('is true when any axis exceeds the usable extent', () => {
    expect(exceedsBox([100, 300, 100], BOX)).toBe(true)
  })
})

describe('pieceCount', () => {
  it('is 1 when the length fits', () => {
    expect(pieceCount(200, 244)).toBe(1)
    expect(pieceCount(244, 244)).toBe(1)
  })
  it('is the ceiling of length / max otherwise', () => {
    expect(pieceCount(600, 244)).toBe(3)
    expect(pieceCount(250, 244)).toBe(2)
  })
})

describe('planCuts', () => {
  it('returns no cuts when the length fits', () => {
    expect(planCuts(200, 244)).toEqual([])
  })

  it('splits into even pieces that each fit', () => {
    const cuts = planCuts(600, 244)
    expect(cuts).toEqual([200, 400])
    // each resulting piece is within the max
    const bounds = [0, ...cuts, 600]
    for (let i = 1; i < bounds.length; i++) {
      expect(bounds[i]! - bounds[i - 1]!).toBeLessThanOrEqual(244)
    }
  })

  it('places a single cut at the midpoint when two pieces suffice', () => {
    expect(planCuts(250, 244)).toEqual([125])
  })
})
